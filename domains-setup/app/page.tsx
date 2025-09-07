"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// @ts-ignore - dns-zonefile doesn't have TypeScript definitions
import zonefile from "dns-zonefile";

const domainSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .regex(/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/, "Invalid domain format")
    .refine(
      (domain) => {
        // Additional validation: no consecutive dots, no leading/trailing dots or hyphens
        return !domain.includes('..') && 
               !domain.startsWith('.') && 
               !domain.endsWith('.') &&
               !domain.startsWith('-') && 
               !domain.endsWith('-') &&
               domain.split('.').every(part => 
                 part.length > 0 && 
                 part.length <= 63 && 
                 !part.startsWith('-') && 
                 !part.endsWith('-')
               ) &&
               domain.split('.').pop()!.match(/^[a-zA-Z]{2,}$/) // TLD must be letters only
      },
      "Invalid domain format"
    ),
});

const emailSchema = z.object({
  to: z.string().email("Invalid email address"),
  fromUser: z.string().min(1, "From user is required").regex(/^[a-zA-Z0-9._-]+$/, "Invalid email username format"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type DomainFormData = z.infer<typeof domainSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

interface DomainData {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
  canReceiveEmails: boolean;
  hasMxRecords: boolean;
  domainProvider?: string;
  providerConfidence?: string;
  dnsRecords?: DnsRecord[];
  createdAt: string;
  updatedAt: string;
  verificationCheck?: {
    dnsRecords: DnsRecord[];
    sesStatus: string;
    dkimStatus: string;
    dkimVerified: boolean;
    dkimTokens: string[];
    mailFromDomain: string;
    mailFromStatus: string;
    mailFromVerified: boolean;
    isFullyVerified: boolean;
    lastChecked: string;
  };
}

interface DnsRecord {
  type: "TXT" | "MX" | "CNAME";
  name: string;
  value: string;
  isRequired?: boolean;
  isVerified?: boolean;
  error?: string;
}

// LocalStorage keys
const DOMAIN_DATA_KEY = "inbound_domain_data";
const CURRENT_STEP_KEY = "inbound_current_step";

export default function DomainsDashboard() {
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [isDnsConfigExpanded, setIsDnsConfigExpanded] = useState(true);
  const [isEmailSectionExpanded, setIsEmailSectionExpanded] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
  });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
    reset: resetEmail,
    setValue: setEmailValue
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedDomainData = localStorage.getItem(DOMAIN_DATA_KEY);
      const savedCurrentStep = localStorage.getItem(CURRENT_STEP_KEY);
      
      if (savedDomainData) {
        const parsedDomainData = JSON.parse(savedDomainData);
        setDomainData(parsedDomainData);
      }
      
      if (savedCurrentStep) {
        const parsedStep = parseInt(savedCurrentStep, 10);
        if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 4) {
          setCurrentStep(parsedStep);
        }
      }
    } catch (error) {
      console.warn('Failed to load data from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(DOMAIN_DATA_KEY);
      localStorage.removeItem(CURRENT_STEP_KEY);
    }
  }, []);

  // Save domain data to localStorage whenever it changes
  useEffect(() => {
    if (domainData) {
      localStorage.setItem(DOMAIN_DATA_KEY, JSON.stringify(domainData));
    } else {
      localStorage.removeItem(DOMAIN_DATA_KEY);
    }
  }, [domainData]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CURRENT_STEP_KEY, currentStep.toString());
  }, [currentStep]);

  // Helper function to clear all saved data
  const clearSavedData = () => {
    setDomainData(null);
    setCurrentStep(1);
    setError(null);
    setEmailError(null);
    setEmailSuccess(null);
    setIsDnsConfigExpanded(true);
    setIsEmailSectionExpanded(true);
    reset();
    resetEmail();
    localStorage.removeItem(DOMAIN_DATA_KEY);
    localStorage.removeItem(CURRENT_STEP_KEY);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Helper function to get DNS records from either location
  const getDnsRecords = (domainData: DomainData | null): DnsRecord[] => {
    if (!domainData) return [];
    
    // Check verificationCheck first (newer API response format)
    if (domainData.verificationCheck?.dnsRecords) {
      return domainData.verificationCheck.dnsRecords;
    }
    
    // Fallback to direct dnsRecords (older API response format)
    return domainData.dnsRecords || [];
  };

  // Convert DNS records to dns-zonefile format and generate zone file
  const generateZoneFile = (domainData: DomainData | null): string => {
    if (!domainData) return "";
    
    const dnsRecords = getDnsRecords(domainData);
    if (dnsRecords.length === 0) return "";

    // Extract base domain from the full domain
    // For "agentuity.ryan.ceo" -> base domain should be "ryan.ceo"
    const domainParts = domainData.domain.split('.');
    let baseDomain = '';
    if (domainParts.length >= 2) {
      baseDomain = domainParts.slice(-2).join('.'); // Get last 2 parts (ryan.ceo)
    } else {
      baseDomain = domainData.domain; // Fallback if already a base domain
    }

    // Helper function to convert full domain names to relative names based on origin
    const getRelativeName = (fullName: string, origin: string): string => {
      // Remove origin from the end to get relative name
      if (fullName === origin) {
        return '@';
      } else if (fullName.endsWith(`.${origin}`)) {
        return fullName.replace(`.${origin}`, '');
      } else {
        return fullName; // Already relative or different origin
      }
    };

    // Group records by type
    const recordsByType: { [key: string]: any[] } = {};
    
    dnsRecords.forEach(record => {
      const type = record.type.toLowerCase();
      if (!recordsByType[type]) recordsByType[type] = [];
      
      const relativeName = getRelativeName(record.name, baseDomain);
      
      if (type === 'mx') {
        // Parse MX record: "10 feedback-smtp.us-east-2.amazonses.com"
        const parts = record.value.trim().split(' ');
        if (parts.length >= 2 && !isNaN(Number(parts[0]))) {
          const preference = parseInt(parts[0], 10);
          let host = parts.slice(1).join(' ');
          
          // Ensure MX target has trailing dot for FQDN
          if (!host.endsWith('.')) {
            host += '.';
          }
          
          recordsByType[type].push({
            name: relativeName,
            preference: preference, // priority maps to preference for MX records
            host: host
          });
        }
      } else if (type === 'txt') {
        // Ensure TXT record value is properly quoted
        let txtValue = record.value;
        if (!txtValue.startsWith('"') && !txtValue.endsWith('"')) {
          txtValue = `"${txtValue}"`;
        }
        
        recordsByType[type].push({
          name: relativeName,
          txt: txtValue
        });
      } else if (type === 'a') {
        recordsByType[type].push({
          name: relativeName,
          ip: record.value
        });
      } else if (type === 'cname') {
        let alias = record.value;
        
        // Ensure CNAME alias has trailing dot for FQDN
        if (!alias.endsWith('.')) {
          alias += '.';
        }
        
        recordsByType[type].push({
          name: relativeName,
          alias: alias
        });
      } else if (type === 'ptr') {
        let host = record.value;
        
        // Ensure PTR target has trailing dot for FQDN
        if (!host.endsWith('.')) {
          host += '.';
        }
        
        recordsByType[type].push({
          name: relativeName,
          host: host
        });
      } else if (type === 'srv') {
        // SRV record format: "priority weight port target"
        const parts = record.value.trim().split(' ');
        if (parts.length >= 4) {
          const priority = parseInt(parts[0], 10);
          const weight = parseInt(parts[1], 10);
          const port = parseInt(parts[2], 10);
          let target = parts.slice(3).join(' ');
          
          // Ensure SRV target has trailing dot for FQDN
          if (!target.endsWith('.') && target !== '.') {
            target += '.';
          }
          
          recordsByType[type].push({
            name: relativeName,
            priority: priority,
            weight: weight,
            port: port,
            target: target
          });
        }
      } else if (type === 'spf') {
        // Handle SPF records (similar to TXT but uses 'data' field)
        let spfValue = record.value;
        if (!spfValue.startsWith('"') && !spfValue.endsWith('"')) {
          spfValue = `"${spfValue}"`;
        }
        
        recordsByType[type].push({
          name: relativeName,
          data: spfValue
        });
      }
    });

    // Create zonefile data structure with base domain as origin
    const zonefileData: any = {
      $origin: `${baseDomain}.`,
      $ttl: 3600,
      soa: {
        mname: "ns1.inbound.new.",        // Already has trailing dot
        rname: `admin.${baseDomain}.`,    // Use base domain for admin email
        serial: Math.floor(Date.now() / 1000),
        refresh: 3600,
        retry: 600,
        expire: 604800,
        minimum: 86400
      }
    };

    // Add record types that exist
    Object.keys(recordsByType).forEach(type => {
      if (recordsByType[type].length > 0) {
        zonefileData[type] = recordsByType[type];
      }
    });

    try {
      console.log('Zone file data before generation:', JSON.stringify(zonefileData, null, 2));
      return zonefile.generate(zonefileData);
    } catch (error) {
      console.error('Zone file generation error:', error);
      return "Error generating zone file";
    }
  };

  // Copy zone file to clipboard and save as file
  const copyAndSaveZoneFile = async () => {
    const zoneFileContent = generateZoneFile(domainData);
    if (zoneFileContent && zoneFileContent !== "Error generating zone file" && domainData) {
      // Copy to clipboard
      await copyToClipboard(zoneFileContent, 'zonefile');
      
      // Save as file
      const blob = new Blob([zoneFileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domainData.domain}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Send test email
  const sendEmail = async (data: EmailFormData) => {
    if (!domainData) return;
    
    setIsEmailSending(true);
    setEmailError(null);
    setEmailSuccess(null);
    
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${data.fromUser}@${domainData.domain}`,
          fromName: data.fromUser,
          to: data.to,
          subject: data.subject,
          html: `<p>${data.message.replace(/\n/g, '<br>')}</p>`,
          text: data.message,
          tags: [
            { name: "source", value: "domain-setup-demo" },
            { name: "domain", value: domainData.domain }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      setEmailSuccess(`Email sent successfully! ID: ${result.id}`);
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setEmailSuccess(null);
      }, 5000);
      resetEmail();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "An error occurred while sending");
    } finally {
      setIsEmailSending(false);
    }
  };

  // Set default from user when domain changes
  useEffect(() => {
    if (domainData && domainData.status === "verified") {
      setEmailValue("fromUser", "hello");
    }
  }, [domainData, setEmailValue]);

  const createDomain = async (data: DomainFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: data.domain }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create domain: ${response.statusText}`);
      }

      const result = await response.json();
      setDomainData(result);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDomain = async () => {
    if (!domainData?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/domains/${domainData.id}?check=true`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to refresh domain: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('DNS Check API Response:', result);
      console.log('DNS Records found:', getDnsRecords(result));
      setDomainData(result);
      
      if (result.status === "verified") {
        setCurrentStep(4);
        // Collapse DNS config when verified since it's no longer primary focus
        setIsDnsConfigExpanded(false);
      } else if (result.hasMxRecords) {
        setCurrentStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const progressSteps = [
    { step: 1, title: "Add Domain", description: "Enter your domain to get started", completed: currentStep > 1 },
    { step: 2, title: "Configure DNS", description: "Add the required DNS records", completed: currentStep > 2 },
    { step: 3, title: "Verify Records", description: "Check that DNS propagation is complete", completed: currentStep > 3 },
    { step: 4, title: "Complete Setup", description: "Your domain is ready to receive emails", completed: currentStep === 4 }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-3xl font-bold tracking-tight">Inbound Email Domain Setup</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set up your domain to start receiving emails programmatically with Inbound. Follow the steps below to configure DNS and verify your domain.
          </p>
          {domainData && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                Progress saved - safe to refresh
              </Badge>
            </div>
          )}
        </div>

        {/* Progress Cards */}
        <div className="flex gap-2 justify-center">
          {progressSteps.map((item) => (
            <div key={item.step} className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.completed ? 'bg-green-100 text-green-800' : 
              currentStep === item.step ? 'bg-blue-100 text-blue-800' : 
              'bg-muted text-muted-foreground'
            }`}>
              {item.step} - {item.title}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form and Actions */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Domain Setup</CardTitle>
                <CardDescription>
                  Add your domain to start receiving emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!domainData ? (
                  <form onSubmit={handleSubmit(createDomain)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain Name</Label>
                      <Input
                        id="domain"
                        placeholder="example.com"
                        {...register("domain")}
                        className={errors.domain ? "border-red-500" : ""}
                      />
                      {errors.domain && (
                        <p className="text-sm text-red-600">{errors.domain.message}</p>
                      )}
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? "Adding Domain..." : "Add Domain"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{domainData.domain}</p>
                        <Badge className={getStatusColor(domainData.status)}>
                          {domainData.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={refreshDomain} disabled={isLoading} variant="outline" size="sm">
                        {isLoading ? "Checking..." : "Refresh Status"}
                      </Button>
                      <Button 
                        onClick={clearSavedData}
                        variant="outline" 
                        size="sm"
                      >
                        Add New Domain
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert className="border-red-200">
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - DNS Records and Status */}
          <div className="lg:col-span-2">
            {domainData && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>DNS Configuration</CardTitle>
                      <CardDescription>
                        Add these DNS records to your domain provider
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDnsConfigExpanded(!isDnsConfigExpanded)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isDnsConfigExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </CardHeader>
                {isDnsConfigExpanded && (
                  <CardContent>
                  <Tabs defaultValue="records" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="records">DNS Records</TabsTrigger>
                      <TabsTrigger value="status">Status</TabsTrigger>
                      <TabsTrigger value="zonefile">Zone File</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="records" className="space-y-4 mt-4">
                      {(() => {
                        const dnsRecords = getDnsRecords(domainData);
                        return dnsRecords.length > 0 ? dnsRecords.map((record, index) => {
                        // Parse MX records to extract priority and hostname
                        const isMxRecord = record.type === 'MX';
                        let priority = '';
                        let cleanValue = record.value;
                        
                        if (isMxRecord && record.value) {
                          const parts = record.value.trim().split(' ');
                          if (parts.length >= 2 && !isNaN(Number(parts[0]))) {
                            priority = parts[0];
                            cleanValue = parts.slice(1).join(' ');
                          }
                        }

                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{record.type}</Badge>
                              {record.isRequired && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                              {record.isVerified === false && record.error && (
                                <Badge variant="destructive" className="text-xs">Not Verified</Badge>
                              )}
                              {record.isVerified === true && (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">Verified</Badge>
                              )}
                            </div>
                            <div className="bg-muted p-3 rounded-md space-y-1">
                              <div className={`grid grid-cols-1 ${isMxRecord ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 text-sm`}>
                                <div>
                                  <span className="font-medium">Name:</span>
                                  <button
                                    onClick={() => copyToClipboard(record.name, `name-${index}`)}
                                    className="font-mono text-xs break-all text-left hover:bg-background/60 rounded px-1 py-0.5 transition-colors cursor-pointer block w-full"
                                    title="Click to copy"
                                  >
                                    {record.name}
                                    {copiedField === `name-${index}` && (
                                      <span className="ml-1 text-green-600">✓</span>
                                    )}
                                  </button>
                                </div>
                                {isMxRecord && priority && (
                                  <div>
                                    <span className="font-medium">Priority:</span>
                                    <button
                                      onClick={() => copyToClipboard(priority, `priority-${index}`)}
                                      className="font-mono text-xs hover:bg-background/60 rounded px-1 py-0.5 transition-colors cursor-pointer block w-full text-left"
                                      title="Click to copy"
                                    >
                                      {priority}
                                      {copiedField === `priority-${index}` && (
                                        <span className="ml-1 text-green-600">✓</span>
                                      )}
                                    </button>
                                  </div>
                                )}
                                <div className={isMxRecord && priority ? "md:col-span-2" : "md:col-span-2"}>
                                  <span className="font-medium">Value:</span>
                                  <button
                                    onClick={() => copyToClipboard(cleanValue, `value-${index}`)}
                                    className="font-mono text-xs break-all text-left hover:bg-background/60 rounded px-1 py-0.5 transition-colors cursor-pointer block w-full"
                                    title="Click to copy"
                                  >
                                    {cleanValue}
                                    {copiedField === `value-${index}` && (
                                      <span className="ml-1 text-green-600">✓</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            {record.error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-xs text-red-700">{record.error}</p>
                              </div>
                            )}
                            {index < dnsRecords.length - 1 && <Separator />}
                          </div>
                        );
                        }) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No DNS records available yet.</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Click "Refresh Status" to check for updated domain configuration.
                            </p>
                          </div>
                        );
                      })()}
                      
                      {getDnsRecords(domainData).length > 0 && (
                        <Alert>
                          <AlertDescription>
                            DNS changes can take up to 24 hours to propagate. Most providers update within 1-2 hours.
                            Click "Refresh Status" to check verification progress.
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="status" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Domain Status</Label>
                          <Badge className={getStatusColor(domainData.status)}>
                            {domainData.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>MX Records</Label>
                          <Badge className={domainData.hasMxRecords ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {domainData.hasMxRecords ? "Configured" : "Pending"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>Email Reception</Label>
                          <Badge className={domainData.canReceiveEmails ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {domainData.canReceiveEmails ? "Ready" : "Configuring"}
                          </Badge>
                        </div>
                        {domainData.domainProvider && (
                          <div className="space-y-2">
                            <Label>DNS Provider</Label>
                            <p className="text-sm text-muted-foreground">
                              {domainData.domainProvider} ({domainData.providerConfidence} confidence)
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Timestamps</Label>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Created: {new Date(domainData.createdAt).toLocaleString()}</p>
                          <p>Updated: {new Date(domainData.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="zonefile" className="space-y-4 mt-4">
                      {getDnsRecords(domainData).length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-sm font-medium">RFC1035 Zone File</h3>
                              <p className="text-xs text-muted-foreground">
                                Copy to clipboard and download as {domainData.domain}.txt
                              </p>
                            </div>
                            <Button
                              onClick={copyAndSaveZoneFile}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              {copiedField === 'zonefile' ? (
                                <>
                                  <span className="text-green-600">✓</span>
                                  Copied & Saved
                                </>
                              ) : (
                                <>Copy & Save Zone File</>
                              )}
                            </Button>
                          </div>
                          <div className="bg-muted p-4 rounded-md">
                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                              {generateZoneFile(domainData)}
                            </pre>
                          </div>
                          <Alert>
                            <AlertDescription>
                              This zone file is generated from your DNS records and follows RFC1035 standards. 
                              Click the button above to copy to clipboard AND download as a .txt file for use with BIND or other DNS servers.
                            </AlertDescription>
                          </Alert>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No DNS records available to generate zone file.</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Click "Refresh Status" to load DNS records first.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Email Sending Card - Only show when domain is verified */}
            {domainData && domainData.status === "verified" && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Send Test Email</CardTitle>
                      <CardDescription>
                        Test your email setup by sending a message
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEmailSectionExpanded(!isEmailSectionExpanded)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isEmailSectionExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </CardHeader>
                {isEmailSectionExpanded && (
                <CardContent>
                  <form onSubmit={handleEmailSubmit(sendEmail)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="to">To</Label>
                      <Input
                        id="to"
                        placeholder="recipient@example.com"
                        {...registerEmail("to")}
                        className={emailErrors.to ? "border-red-500" : ""}
                      />
                      {emailErrors.to && (
                        <p className="text-sm text-red-600">{emailErrors.to.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromUser">From</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="fromUser"
                          placeholder="hello"
                          {...registerEmail("fromUser")}
                          className={`flex-1 ${emailErrors.fromUser ? "border-red-500" : ""}`}
                        />
                        <span className="text-sm text-muted-foreground">@{domainData.domain}</span>
                      </div>
                      {emailErrors.fromUser && (
                        <p className="text-sm text-red-600">{emailErrors.fromUser.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Test email from domain setup"
                        {...registerEmail("subject")}
                        className={emailErrors.subject ? "border-red-500" : ""}
                      />
                      {emailErrors.subject && (
                        <p className="text-sm text-red-600">{emailErrors.subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Hello! This is a test email from my newly configured domain."
                        rows={4}
                        {...registerEmail("message")}
                        className={emailErrors.message ? "border-red-500" : ""}
                      />
                      {emailErrors.message && (
                        <p className="text-sm text-red-600">{emailErrors.message.message}</p>
                      )}
                    </div>

                    <Button type="submit" disabled={isEmailSending} className="w-full">
                      {isEmailSending ? "Sending..." : "Send Email"}
                    </Button>

                    {emailError && (
                      <Alert className="border-red-200">
                        <AlertDescription className="text-red-700">
                          {emailError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {emailSuccess && (
                      <Alert className="border-green-200">
                        <AlertDescription className="text-green-700">
                          {emailSuccess}
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>

                  <Alert className="mt-4">
                    <AlertDescription>
                      <strong>Note:</strong> You can send from any user on your verified domain. 
                      Choose a username (like "hello", "support", "noreply") and it will send from that address on your domain.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                )}
              </Card>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
