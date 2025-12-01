"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Check, Upload, Plus, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, name: "Business Profile" },
  { id: 2, name: "FAQs" },
  { id: 3, name: "Services" },
  { id: 4, name: "Escalation" },
  { id: 5, name: "AI Personality" },
]

const mockFaqs = [
  { id: 1, question: "What are your check-in hours?", answer: "Check-in is available from 3:00 PM onwards." },
  { id: 2, question: "Do you offer room service?", answer: "Yes, 24/7 room service is available." },
  { id: 3, question: "Is parking available?", answer: "Yes, we have complimentary valet parking." },
]

const mockServices = [
  { id: 1, name: "Room Service", price: "$25", description: "24/7 in-room dining", active: true },
  { id: 2, name: "Spa Treatment", price: "$120", description: "Full body massage", active: true },
  { id: 3, name: "Airport Transfer", price: "$50", description: "Luxury vehicle pickup", active: false },
]

const personalityOptions = [
  { id: "formal", name: "Formal", description: "Professional and courteous tone for business settings" },
  { id: "friendly", name: "Friendly", description: "Warm and approachable for casual interactions" },
  { id: "professional", name: "Professional", description: "Balanced tone suitable for most businesses" },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [brandColor, setBrandColor] = useState("#10b981")
  const [faqs, setFaqs] = useState(mockFaqs)
  const [services, setServices] = useState(mockServices)
  const [selectedPersonality, setSelectedPersonality] = useState("professional")

  return (
    <AdminLayout title="Onboarding">
      <div className="mx-auto max-w-4xl">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
                      currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step.id
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-0.5 w-12 lg:w-24 transition-colors",
                      currentStep > step.id ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="rounded-2xl shadow-lg">
          {/* Step 1: Business Profile */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Upload your logo and set your brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Business Logo</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" className="rounded-xl bg-transparent">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandColor">Brand Color</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      id="brandColor"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-12 w-12 cursor-pointer rounded-xl border-2 border-border"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-32 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Business Tagline</Label>
                  <Input id="tagline" placeholder="Your hospitality, our priority" className="rounded-xl" />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: FAQs */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Add common questions your AI should answer</CardDescription>
                  </div>
                  <Button className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add FAQ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="flex items-start justify-between rounded-xl border border-border bg-card p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{faq.question}</p>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Services</CardTitle>
                    <CardDescription>Configure services your AI can help with</CardDescription>
                  </div>
                  <Button className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {services.map((service) => (
                        <tr key={service.id} className="bg-card">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{service.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{service.price}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{service.description}</td>
                          <td className="px-4 py-3">
                            <Switch
                              checked={service.active}
                              onCheckedChange={(checked) =>
                                setServices(services.map((s) => (s.id === service.id ? { ...s, active: checked } : s)))
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Escalation Setup */}
          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle>Escalation Setup</CardTitle>
                <CardDescription>Configure how unresolved queries are escalated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="escalationEmail">Escalation Email</Label>
                  <Input
                    id="escalationEmail"
                    type="email"
                    placeholder="support@yourbusiness.com"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Queries the AI cannot handle will be sent here</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input id="whatsapp" type="tel" placeholder="+1 (555) 000-0000" className="rounded-xl" />
                  <p className="text-xs text-muted-foreground">Customers can reach your team directly via WhatsApp</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responseTime">Expected Response Time</Label>
                  <Input id="responseTime" placeholder="Within 2 hours" className="rounded-xl" />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 5: AI Personality */}
          {currentStep === 5 && (
            <>
              <CardHeader>
                <CardTitle>AI Personality</CardTitle>
                <CardDescription>Choose how your AI assistant communicates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {personalityOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedPersonality(option.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 p-4 transition-all",
                        selectedPersonality === option.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{option.name}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {selectedPersonality === option.id && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between border-t border-border p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="rounded-xl"
            >
              Previous
            </Button>
            <Button onClick={() => setCurrentStep(Math.min(5, currentStep + 1))} className="rounded-xl">
              {currentStep === 5 ? "Complete Setup" : "Continue"}
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}
