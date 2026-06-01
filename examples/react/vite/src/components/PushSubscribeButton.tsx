import { usePushSubscription } from "../../swoff/hooks/usePushSubscription";

export default function PushSubscribeButton() {
  const { subscribed, loading, permission, subscribe, unsubscribe, subscription } =
    usePushSubscription();

  const handleToggle = async () => {
    if (subscribed) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      await unsubscribe();
    } else {
      const sub = await subscribe();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      }
    }
  };

  if (loading) return null;
  if (permission === "denied") return null;

  return (
    <button
      onClick={handleToggle}
      title={subscribed ? "Unsubscribe from push notifications" : "Subscribe to push notifications"}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        subscribed
          ? "border-teal-500 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30"
          : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {subscribed ? "🔔 On" : "🔕 Off"}
    </button>
  );
}
