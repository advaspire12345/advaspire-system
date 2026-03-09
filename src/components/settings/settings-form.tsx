"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { Coins, Percent, Mail, Save, Loader2 } from "lucide-react";
import type { SettingsMap } from "@/data/settings";
import type { SettingsFormPayload } from "@/app/(dashboard)/settings/actions";

interface SettingsFormProps {
  initialSettings: SettingsMap;
  onSave: (payload: SettingsFormPayload) => Promise<{ success: boolean; error?: string }>;
}

export function SettingsForm({ initialSettings, onSave }: SettingsFormProps) {
  const [adcoinPerRm, setAdcoinPerRm] = useState(initialSettings.adcoin_per_rm || "333");
  const [poolPercentage, setPoolPercentage] = useState(initialSettings.pool_percentage || "5");
  const [poolAccountEmail, setPoolAccountEmail] = useState(
    initialSettings.pool_account_email || "advaspire@gmail.com"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await onSave({
        adcoinPerRm,
        poolPercentage,
        poolAccountEmail,
      });

      if (!result.success) {
        setError(result.error || "Failed to save settings");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate example
  const exampleAmount = 10;
  const adcoinRate = parseInt(adcoinPerRm) || 333;
  const poolPct = parseFloat(poolPercentage) || 5;
  const totalAdcoins = exampleAmount * adcoinRate;
  const poolContribution = Math.floor(totalAdcoins * (poolPct / 100));

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              AdCoin Pool Settings
            </CardTitle>
            <CardDescription>
              Configure how adcoins are calculated and distributed when payments are approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FloatingInput
              label="AdCoin per RM"
              type="number"
              value={adcoinPerRm}
              onChange={(e) => setAdcoinPerRm(e.target.value)}
              min="1"
              required
            />

            <FloatingInput
              label="Pool Percentage (%)"
              type="number"
              value={poolPercentage}
              onChange={(e) => setPoolPercentage(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              required
            />

            <FloatingInput
              label="Pool Account Email"
              type="email"
              value={poolAccountEmail}
              onChange={(e) => setPoolAccountEmail(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                Settings saved successfully!
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-blue-500" />
              Calculation Preview
            </CardTitle>
            <CardDescription>
              See how adcoins will be calculated with current settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <h4 className="font-medium text-slate-700">Example: RM{exampleAmount} Payment</h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Amount:</span>
                  <span className="font-medium">RM{exampleAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">AdCoin Rate:</span>
                  <span className="font-medium">{adcoinRate} per RM</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600">Total AdCoins:</span>
                  <span className="font-medium text-yellow-600">
                    {totalAdcoins.toLocaleString()} AdCoins
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pool Percentage:</span>
                  <span className="font-medium">{poolPct}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600">Pool Contribution:</span>
                  <span className="font-medium text-green-600">
                    {poolContribution.toLocaleString()} AdCoins
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Pool Account</p>
                    <p className="text-blue-600">{poolAccountEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
