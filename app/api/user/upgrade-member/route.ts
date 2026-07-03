import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * 开通会员（模拟支付）
 * POST /api/user/upgrade-member
 * Header: Authorization: Bearer <token>
 * Body: { type: 'monthly' | 'quarterly' | 'yearly' }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证 token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      userId = Buffer.from(token, "base64").toString("utf-8");
    } catch (_) {
      return NextResponse.json(
        { success: false, error: "登录已过期" },
        { status: 401 }
      );
    }

    // 2. 解析请求参数
    const { type } = await request.json();
    if (!["monthly", "quarterly", "yearly"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "无效的会员类型" },
        { status: 400 }
      );
    }

    // 3. 计算到期时间
    const now = new Date();
    let expireDate: Date;
    if (type === "monthly") {
      expireDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (type === "quarterly") {
      expireDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else {
      // yearly
      expireDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    // 4. 更新数据库
    const db = getDb();
    db.prepare(
      "UPDATE users SET member_type = ?, member_expire = ? WHERE user_id = ?"
    ).run(type, expireDate.toISOString().replace("T", " ").slice(0, 19), userId);

    console.log(
      `[UpgradeMember] 用户 ${userId} 开通了 ${type} 会员，到期时间：${expireDate}`
    );

    // 5. 返回结果
    const memberNames: Record<string, string> = {
      monthly: "月度会员",
      quarterly: "季度会员",
      yearly: "年度会员",
    };

    return NextResponse.json({
      success: true,
      message: `成功开通${memberNames[type]}！`,
      member: {
        type,
        typeName: memberNames[type],
        expire: expireDate.toISOString().replace("T", " ").slice(0, 19),
      },
    });
  } catch (error) {
    console.error("[UpgradeMember] 错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
