import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    let body: any = {}

    if (contentType.includes("application/json")) {
      body = await req.json()
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      body = await req.text()
    }

    console.log("Payment Chargeback Callback:", body)
    
    // TODO: Handle chargeback notification
    
    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("Payment Chargeback Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
    return POST(req)
}