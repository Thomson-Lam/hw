import { Button } from "@/components/ui/button";

/** The crisis exit's destination. Text is fixed, never written by the paver. */
export function HelpTile() {
  return (
    <div className="flex flex-col gap-3" data-testid="help">
      <p className="text-base">If you are thinking about suicide or worried about someone, call or text 9-8-8, any time, day or night.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-11" render={<a href="tel:988" />}>
          Call 9-8-8
        </Button>
        <Button variant="outline" className="h-11" render={<a href="sms:988" />}>
          Text 9-8-8
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Suicide Crisis Helpline (Canada) · 988.ca</p>
    </div>
  );
}
