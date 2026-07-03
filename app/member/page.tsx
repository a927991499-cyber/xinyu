"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crown } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function MemberPage() {
  const router = useRouter();
  const [memberStatus, setMemberStatus] = useState({
    type: "free",
    typeName: "免费用户",
    expire: null as string | null,
    isExpired: false,
  });
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);

  // 会员方案
  const plans = [
    {
      type: "monthly" as const,
      name: "月度会员",
      price: 29,
      period: "月",
      description: "适合短期体验",
      features: ["图片无限生成", "100条记忆", "优先回复"],
    },
    {
      type: "quarterly" as const,
      name: "季度会员",
      price: 79,
      period: "季",
      description: "适合长期使用",
      features: ["图片无限生成", "记忆无限", "语音通话", "专属AI人设"],
      popular: true,
    },
    {
      type: "yearly" as const,
      name: "年度会员",
      price: 299,
      period: "年",
      description: "最划算！省¥49",
      features: ["图片无限生成", "记忆无限", "语音通话", "专属AI人设", "回忆相册", "24小时客服"],
      bestValue: true,
    },
  ];

  // 获取会员状态
  useEffect(() => {
    fetchMemberStatus();
  }, []);

  const fetchMemberStatus = async () => {
    try {
      const token = localStorage.getItem("xinyu_token") || "";
      const res = await fetch("/api/user/member-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setMemberStatus(data.member);
      }
    } catch (error) {
      console.error("获取会员状态失败:", error);
    }
  };

  // 开通会员（模拟支付）
  const handleUpgrade = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("xinyu_token") || "";
      const res = await fetch("/api/user/upgrade-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: selectedPlan }),
      });
      const data = await res.json();

      if (data.success) {
        alert(`🎉 ${data.message}`);
        fetchMemberStatus(); // 刷新状态
      } else {
        alert("开通失败：" + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("开通会员失败:", error);
      alert("开通失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部渐变背景 */}
      <div className="bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 px-4 pb-20 pt-12">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">开通会员</h1>
        </div>

        {/* 当前会员状态 */}
        <div className="bg-white/20 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">当前会员</p>
              <p className="text-xl font-bold mt-1">{memberStatus.typeName}</p>
            </div>
            {memberStatus.type !== "free" && (
              <div className="text-right">
                <p className="text-sm opacity-80">到期时间</p>
                <p className="text-sm mt-1">{formatDate(memberStatus.expire!)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 会员方案选择 */}
      <div className="px-4 -mt-10 mb-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">💎 选择会员方案</h2>

          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.type}
                onClick={() => setSelectedPlan(plan.type)}
                className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.type
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white hover:border-purple-200"
                }`}
              >
                {/* 热门/最划算标签 */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full">
                    最受欢迎
                  </div>
                )}
                {plan.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-full">
                    最划算
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className={`size-5 ${selectedPlan === plan.type ? "text-purple-500" : "text-gray-400"}`} />
                    <span className="font-bold text-gray-800">{plan.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-800">¥{plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-3">{plan.description}</p>

                {/* 权益列表 */}
                <div className="space-y-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="size-4 text-green-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 立即开通按钮 */}
      <div className="px-4 mb-4">
        <button
          onClick={handleUpgrade}
          disabled={loading || memberStatus.type === selectedPlan}
          className={`w-full rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-6 py-4 text-center text-lg font-bold text-white shadow-lg shadow-purple-300/50 transition-transform hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? "开通中..." : memberStatus.type === selectedPlan ? "当前方案" : `立即开通 ¥${plans.find(p => p.type === selectedPlan)?.price}`}
        </button>

        {memberStatus.type !== "free" && (
          <p className="text-center text-sm text-gray-500 mt-2">
            当前已是 {memberStatus.typeName}，无需重复开通
          </p>
        )}
      </div>

      {/* 会员权益说明 */}
      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-800 mb-3">📋 会员权益说明</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 会员开通后立即生效</p>
            <p>• 会员到期后自动降级为免费用户</p>
            <p>• 免费用户可享受文字聊天（无限次）</p>
            <p>• 图片生成、语音通话等功能需开通会员</p>
            <p>• 如有问题，请联系客服</p>
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <BottomNav />
    </div>
  );
}
