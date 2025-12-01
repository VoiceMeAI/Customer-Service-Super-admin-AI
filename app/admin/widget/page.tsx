"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Code, Globe, MessageSquare, ExternalLink } from "lucide-react";

const embedScript = `<!-- voiceme Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['voicemeWidget']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','fd','https://widget.voiceme.com/loader.js'));
  fd('init', { businessId: 'biz_abc123xyz' });
</script>`;

export default function WidgetPage() {
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    if (domain) {
      setIsGenerated(true);
    }
  };

  return (
    <AdminLayout title="Widget">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chat Widget</h2>
          <p className="text-sm text-muted-foreground">Configure and embed the AI chat widget on your website</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Configuration
              </CardTitle>
              <CardDescription>Enter your website domain to generate the embed code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  placeholder="https://yourwebsite.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Enter the full URL including https://</p>
              </div>

              <Button onClick={handleGenerate} className="w-full rounded-xl" disabled={!domain}>
                <Code className="mr-2 h-4 w-4" />
                Generate Script
              </Button>

              {isGenerated && (
                <div className="rounded-xl bg-primary/10 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Widget configured for {domain}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget Preview */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Widget Preview
              </CardTitle>
              <CardDescription>Preview how the chat widget will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/30">
                {/* Mock browser chrome */}
                <div className="flex h-8 items-center gap-2 border-b border-border bg-muted/50 px-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {domain || "yourwebsite.com"}
                  </div>
                </div>

                {/* Mock website content */}
                <div className="relative h-full p-4">
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>

                  {/* Chat widget bubble */}
                  <div className="absolute bottom-4 right-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
                      <MessageSquare className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Embed Code */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Code
                </CardTitle>
                <CardDescription>Copy and paste this code before the closing {"</body>"} tag</CardDescription>
              </div>
              <Button onClick={handleCopy} variant="outline" className="rounded-xl bg-transparent">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl bg-foreground p-4 text-sm text-background">
                <code>{embedScript}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
                <ExternalLink className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Need help installing?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check out our installation guides for popular platforms including WordPress, Shopify, Wix, and custom
                  websites.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg bg-transparent">
                    WordPress Guide
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg bg-transparent">
                    Shopify Guide
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg bg-transparent">
                    Custom Website
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
