import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = {}

    if (contentType.includes("application/json")) {
      body = await req.json()
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      body = await req.text()
    }

    console.log("Payment Refund Callback:", body)
    
    // TODO: Handle refund notification
    
    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("Payment Refund Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
    return POST(req)
}