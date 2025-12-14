import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentFailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-zinc-950 dark:shadow-zinc-900/20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ошибка оплаты
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            К сожалению, платеж не был завершен. Попробуйте еще раз или выберите другой способ оплаты.
          </p>
        </div>

        <div className="w-full pt-4 space-y-3">
          <Link
            href="https://t.me/RBTradeBot"
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
          >
            Попробовать снова
          </Link>
          
          <Link
            href="https://t.me/RBTradeSupport"
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-transparent px-4 py-3 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-900"
          >
            Написать в поддержку
          </Link>
        </div>
      </div>
    </div>
  );
}
