import { NextResponse } from "next/server";
import { isCosmosConfigured, isOpenAiConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    ok: true,
    openAiConfigured: isOpenAiConfigured(),
    cosmosConfigured: isCosmosConfigured(),
    speechConfigured: Boolean(process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY),
    storeMode: isCosmosConfigured() ? "cosmos" : "in-memory"
  });
}
