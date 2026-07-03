import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * 获取用户会员状态
 * GET /api/user/member-status
 * Header: Authorization: Bearer <token>
 */
export async function GET(request: NextRequest) {
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

    // 2. 查询用户会员状态
    const db = getDb();
    const user = db
      .prepare("SELECT member_type, member_expire FROM users WHERE user_id = ?")
      .get(userId) as {
      member_type: string;
      member_expire: string | null;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 3. 检查会员是否过期
    let isExpired = false;
    if (user.member_type !== "free" && user.member_expire) {
      const expireTime = new Date(user.member_expire).getTime();
      const now = new Date().getTime();
      if (expireTime < now) {
        // 会员已过期，自动降级为免费用户
        db.prepare(
          "UPDATE users SET member_type = 'free', member_expire = NULL WHERE user_id = ?"
        ).run(userId);
        user.member_type = "free";
        user.member_expire = null;
        isExpired = true;
      }
    }

    // 4. 返回会员状态
    const memberNames: Record<string, string> = {
      free: "免费用户",
      monthly: "月度会员",
      quarterly: "季度会员",
      yearly: "年度会员",
    };

    const memberPrices: Record<string, number> = {
      monthly: 29,
      quarterly: 79,
      yearly: 299,
    };

    return NextResponse.json({
      success: true,
      member: {
        type: user.member_type,
        typeName: memberNames[user.member_type] || "免费用户",
        expire: user.member_expire,
        isExpired,
        price: user.member_type === "free" ? 0 : memberPrices[user.member_type],
      },
    });
  } catch (error) {
    console.error("[MemberStatus] 错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
