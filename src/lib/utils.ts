import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function prettyJson(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function errorRedirect(
  req: NextRequest,
  statusCode: number,
  message: string,
  endpoint?: string
) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const endpointPath = endpoint || url.pathname;
  
  const id = Math.random().toString(36).substring(2, 15);
  const errorUrl = `${baseUrl}/error/${statusCode}?id=${id}&message=${encodeURIComponent(message)}&endpoint=${encodeURIComponent(endpointPath)}`;
  
  return NextResponse.redirect(errorUrl, { status: 302 });
}
