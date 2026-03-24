import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Calendar,
  Target,
  TrendingUp,
  FileText,
  CreditCard,
  Settings,
  Plus
} from "lucide-react";

const Advertiser = () => {
  const advertiserProfile = {
    name: "Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    phone: "+1 (555) 123-4567",
    company: "TechCorp Solutions",
    role: "Marketing Director",
    memberSince: "January 2023",
    totalSpend: 45600,
    activeCampaigns: 3,
    completedCampaigns: 12,
    avgCTR: 0.58
  };

  const recentActivity = [
    {
      id: 1,
      type: "campaign_started",
      title: "Summer Sale Campaign launched",
      description: "Campaign started on Times Square Billboard",
      date: "2024-09-20",
      amount: "₹1,200"
    },
    {
      id: 2,
      type: "payment",
      title: "Payment processed",
      description: "Monthly billing for Q3 campaigns",
      date: "2024-09-15",
      amount: "₹3,450"
    },
    {
      id: 3,
      type: "campaign_completed",
      title: "Brand Awareness Campaign completed",
      description: "Campaign ended with 95% budget utilization",
      date: "2024-09-10",
      amount: "₹2,850"
    },
    {
      id: 4,
      type: "booking",
      title: "New billboard booked",
      description: "Reserved Downtown Financial District slot",
      date: "2024-09-08",
      amount: "₹680"
    }
  ];

  const billingHistory = [
    {
      id: 1,
      date: "2024-09-15",
      description: "September 2024 - Campaign charges",
      amount: 3450,
      status: "paid"
    },
    {
      id: 2,
      date: "2024-08-15",
      description: "August 2024 - Campaign charges",
      amount: 2890,
      status: "paid"
    },
    {
      id: 3,
      date: "2024-07-15",
      description: "July 2024 - Campaign charges",
      amount: 4120,
      status: "paid"
    },
    {
      id: 4,
      date: "2024-06-15",
      description: "June 2024 - Campaign charges",
      amount: 3680,
      status: "paid"
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'campaign_started':
      case 'campaign_completed':
        return <Target className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'booking':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Advertiser Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and view activity
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Account Settings
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="text-lg">
                {advertiserProfile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{advertiserProfile.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {advertiserProfile.role} at {advertiserProfile.company}
              </CardDescription>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {advertiserProfile.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {advertiserProfile.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member since {advertiserProfile.memberSince}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{advertiserProfile.totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime advertising spend
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advertiserProfile.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advertiserProfile.completedCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advertiserProfile.avgCTR}%</div>
            <p className="text-xs text-muted-foreground">
              Above industry average
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest account activity and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-b-0">
                    <div className="p-2 bg-muted rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{activity.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View and download your invoices</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Download All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billingHistory.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <h4 className="font-medium">{bill.description}</h4>
                      <p className="text-sm text-muted-foreground">{bill.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">₹{bill.amount.toLocaleString()}</p>
                        <Badge className="bg-success text-success-foreground text-xs">
                          {bill.status}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.phone}</p>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Personal Information
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Your business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.company}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.role}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member Since</label>
                  <p className="text-sm bg-muted p-2 rounded">{advertiserProfile.memberSince}</p>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Company Information
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Advertiser;