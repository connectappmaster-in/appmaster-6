import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockDeals } from "@/lib/mockData";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";

const stageConfig = {
  lead: { label: "Lead", color: "bg-muted text-muted-foreground" },
  qualified: { label: "Qualified", color: "bg-primary/10 text-primary" },
  proposal: { label: "Proposal", color: "bg-warning/10 text-warning" },
  won: { label: "Won", color: "bg-success/10 text-success" },
  lost: { label: "Lost", color: "bg-destructive/10 text-destructive" }
};

const Deals = () => {
  const stages = ["lead", "qualified", "proposal", "won"] as const;

  const getDealsByStage = (stage: typeof stages[number]) => {
    return mockDeals.filter(deal => deal.stage === stage);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Deals Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track your sales opportunities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => {
          const deals = getDealsByStage(stage);
          const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
          
          return (
            <Card key={stage} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span className="capitalize">{stage}</span>
                  <Badge variant="secondary">{deals.length}</Badge>
                </CardTitle>
                <p className="text-2xl font-bold text-primary">
                  ${(totalValue / 1000).toFixed(0)}K
                </p>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {deals.map((deal) => (
                  <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm leading-tight">
                          {deal.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {deal.customer}
                        </p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">${(deal.value / 1000).toFixed(0)}K</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{deal.probability}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(deal.closeDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {deals.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No deals in this stage
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Deals;
