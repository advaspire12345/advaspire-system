"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopupRequestModal } from "@/components/marketplace/topup-request-modal";

export function MarketplaceCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="bg-white border border-border shadow-sm max-w-md">
        <CardContent className="p-8 flex flex-col items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD23F]/20">
            <Coins className="h-8 w-8 text-[#F1A104]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Adcoin Top Up</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Exchange AdCoins to reward your students with personalized incentives that go above and beyond.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold h-[44px] px-6 mt-2"
          >
            Exchange Adcoin
          </Button>
        </CardContent>
      </Card>

      <TopupRequestModal open={open} onOpenChange={setOpen} />
    </>
  );
}
