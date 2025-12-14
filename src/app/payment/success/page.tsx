import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-zinc-950 dark:shadow-zinc-900/20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Оплата прошла успешно!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Ваш баланс успешно пополнен. Вы можете вернуться в бота и совершить покупку.
          </p>
        </div>

        <div className="w-full pt-4">
          <Link
            href="https://t.me/RBTradeBot" 
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            Вернуться в бота
          </Link>
        </div>
        
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Если деньги не поступили в течение 5 минут, обратитесь в поддержку.
        </p>
      </div>
    </div>
  );
}
