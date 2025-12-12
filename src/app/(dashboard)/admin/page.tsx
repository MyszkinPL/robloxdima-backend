import { Overview } from "@/components/admin/overview"
import { RecentSales } from "@/components/admin/recent-sales"
import { DetailedStock } from "@/components/admin/detailed-stock"
import { SectionCards } from "@/components/section-cards"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAuthenticatedRbxClient } from "@/lib/api-client"
import { getOrders } from "@/lib/db"
import { BalanceResponse, StockResponse } from "@/lib/rbxcrate"
import { Info } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  let balance = "0";
  let stock = "0";

  // Fetch API data
  try {
    const client = await getAuthenticatedRbxClient();
    const [balanceData, stockData] = await Promise.all([
      client.balance.get().catch(() => ({ balance: 0 } as BalanceResponse)), 
      client.stock.getSummary().catch(() => ({ robuxAvailable: 0 } as unknown as StockResponse)), 
    ]);

    balance = balanceData.balance?.toString() || "0";
    stock = stockData.robuxAvailable?.toString() || "0";
  } catch (error) {
    console.error("Failed to fetch RBXCrate data:", error);
    // Fallback
    balance = "0";
    stock = "0";
  }

  const orders = await getOrders()

  const ordersCount = orders.length;
  const uniqueClients = new Set(orders.map(o => o.username));
  const clientsCount = uniqueClients.size;

  // Calculate Chart Data
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const chartDataMap = new Map<number, number>();
  for (let i = 0; i < 12; i++) {
    chartDataMap.set(i, 0);
  }

  let salesThisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  orders.forEach(order => {
    const date = new Date(order.createdAt);
    const month = date.getMonth();
    
    // Only include current year for the monthly chart, or maybe last 12 months? 
    // For simplicity, let's just aggregate all by month index (assuming 1 year view)
    // or strictly current year. Let's stick to simple month aggregation for now.
    const revenue = chartDataMap.get(month) || 0;
    chartDataMap.set(month, revenue + order.price);

    if (month === currentMonth && date.getFullYear() === currentYear) {
      salesThisMonth++;
    }
  });

  const chartData = months.map((month, index) => ({
    month,
    revenue: chartDataMap.get(index) || 0
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Alert className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300">
        <Info className="h-4 w-4" />
        <AlertTitle>Информация для администратора</AlertTitle>
        <AlertDescription>
          Не забудьте проверить баланс на RBXCrate перед запуском рекламы. Текущий курс закупки стабилен.
        </AlertDescription>
      </Alert>

      <SectionCards 
        balance={balance} 
        stock={stock} 
        ordersCount={ordersCount}
        clientsCount={clientsCount}
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Обзор выручки</CardTitle>
            <CardDescription>
              График доходов по месяцам.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={chartData} />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Недавние продажи</CardTitle>
            <CardDescription>
              Вы совершили {salesThisMonth} продаж в этом месяце.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales orders={orders} />
          </CardContent>
        </Card>
      </div>

      <DetailedStock />
    </div>
  )
}
