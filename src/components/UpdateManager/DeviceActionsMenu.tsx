import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Terminal,
  RotateCcw,
  Download,
  Image,
  RefreshCw,
  Power,
  Lock,
} from "lucide-react";

interface DeviceActionsMenuProps {
  deviceId: string;
  deviceName: string;
  organisationId: string | null;
}

type ActionType = "run_command" | "reboot" | "install_updates" | "push_wallpaper" | "scan_updates" | "shutdown" | "lock";

const actionConfig: Record<ActionType, { icon: typeof Terminal; label: string; description: string; requiresInput?: boolean }> = {
  run_command: { icon: Terminal, label: "Run Command", description: "Execute a PowerShell command on this device", requiresInput: true },
  reboot: { icon: RotateCcw, label: "Reboot", description: "Restart this device" },
  install_updates: { icon: Download, label: "Install Updates", description: "Install all pending Windows updates" },
  push_wallpaper: { icon: Image, label: "Push Wallpaper", description: "Set desktop wallpaper from URL", requiresInput: true },
  scan_updates: { icon: RefreshCw, label: "Scan for Updates", description: "Trigger a Windows Update scan" },
  shutdown: { icon: Power, label: "Shutdown", description: "Shut down this device" },
  lock: { icon: Lock, label: "Lock Screen", description: "Lock the device screen" },
};

export const DeviceActionsMenu = ({ deviceId, deviceName, organisationId }: DeviceActionsMenuProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");

  const createAction = useMutation({
    mutationFn: async ({ actionType, payload }: { actionType: ActionType; payload?: Record<string, unknown> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData = {
        device_id: deviceId,
        organisation_id: organisationId,
        action_type: actionType,
        action_payload: payload || {},
        initiated_by: user.id,
        status: "pending",
      };

      // @ts-ignore - Bypass type inference issue
      const { error } = await supabase.from("device_actions").insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-actions"] });
      toast.success(`Action queued for ${deviceName}`);
      setDialogOpen(false);
      setCommandInput("");
      setWallpaperUrl("");
    },
    onError: (error) => {
      toast.error("Failed to queue action: " + error.message);
    },
  });

  const handleActionClick = (action: ActionType) => {
    const config = actionConfig[action];
    if (config.requiresInput) {
      setSelectedAction(action);
      setDialogOpen(true);
    } else {
      // Confirm dangerous actions
      if (action === "reboot" || action === "shutdown") {
        setSelectedAction(action);
        setDialogOpen(true);
      } else {
        createAction.mutate({ actionType: action });
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedAction) return;

    let payload: Record<string, unknown> = {};
    
    if (selectedAction === "run_command") {
      if (!commandInput.trim()) {
        toast.error("Please enter a command");
        return;
      }
      payload = { command: commandInput };
    } else if (selectedAction === "push_wallpaper") {
      if (!wallpaperUrl.trim()) {
        toast.error("Please enter a wallpaper URL");
        return;
      }
      payload = { wallpaper_url: wallpaperUrl };
    }

    createAction.mutate({ actionType: selectedAction, payload });
  };

  const renderDialogContent = () => {
    if (!selectedAction) return null;
    const config = actionConfig[selectedAction];

    if (selectedAction === "run_command") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Run Command on {deviceName}</DialogTitle>
            <DialogDescription>
              Enter a PowerShell command to execute on this device. The command will be queued and executed when the device checks in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="command">PowerShell Command</Label>
              <Textarea
                id="command"
                placeholder="Get-Process | Select-Object -First 10"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                className="font-mono text-sm"
                rows={4}
              />
            </div>
          </div>
        </>
      );
    }

    if (selectedAction === "push_wallpaper") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Push Wallpaper to {deviceName}</DialogTitle>
            <DialogDescription>
              Enter the URL of an image to set as the desktop wallpaper.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wallpaper">Wallpaper URL</Label>
              <Input
                id="wallpaper"
                placeholder="https://example.com/wallpaper.jpg"
                value={wallpaperUrl}
                onChange={(e) => setWallpaperUrl(e.target.value)}
              />
            </div>
          </div>
        </>
      );
    }

    // Confirmation dialog for dangerous actions
    return (
      <>
        <DialogHeader>
          <DialogTitle>{config.label} {deviceName}?</DialogTitle>
          <DialogDescription>
            {config.description}. This action will be queued and executed when the device checks in.
          </DialogDescription>
        </DialogHeader>
      </>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleActionClick("scan_updates")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Scan for Updates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick("install_updates")}>
            <Download className="h-4 w-4 mr-2" />
            Install Updates
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleActionClick("run_command")}>
            <Terminal className="h-4 w-4 mr-2" />
            Run Command
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick("push_wallpaper")}>
            <Image className="h-4 w-4 mr-2" />
            Push Wallpaper
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleActionClick("lock")}>
            <Lock className="h-4 w-4 mr-2" />
            Lock Screen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick("reboot")} className="text-orange-600">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reboot
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick("shutdown")} className="text-red-600">
            <Power className="h-4 w-4 mr-2" />
            Shutdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {renderDialogContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={createAction.isPending}>
              {createAction.isPending ? "Queuing..." : "Queue Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
