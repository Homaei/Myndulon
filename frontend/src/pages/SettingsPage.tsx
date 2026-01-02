import { useState, useEffect } from "react";
import { Save, Server, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";

interface Config {
    ai_provider: "openai" | "local";
    openai_api_key: string;
    ollama_base_url: string;
}

export function SettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<Config>({
        ai_provider: "openai",
        openai_api_key: "",
        ollama_base_url: "http://host.docker.internal:11434",
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/admin/config");
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (error) {
            console.error("Failed to load config:", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (!res.ok) throw new Error("Failed to save settings");

            toast({
                title: "Settings saved",
                description: "System configuration has been updated successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground">
                    Configure AI providers and system preferences.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        AI Provider
                    </CardTitle>
                    <CardDescription>
                        Choose between OpenAI (Cloud) or Local AI (Ollama/FastEmbed).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RadioGroup
                        value={config.ai_provider}
                        onValueChange={(val: "openai" | "local") =>
                            setConfig({ ...config, ai_provider: val })
                        }
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem
                                value="openai"
                                id="openai"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="openai"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Globe className="mb-3 h-6 w-6" />
                                <div className="text-center space-y-1">
                                    <div className="font-semibold">OpenAI (Cloud)</div>
                                    <div className="text-xs text-muted-foreground">
                                        Requires API Key. Best quality.
                                    </div>
                                </div>
                            </Label>
                        </div>

                        <div>
                            <RadioGroupItem
                                value="local"
                                id="local"
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor="local"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Shield className="mb-3 h-6 w-6" />
                                <div className="text-center space-y-1">
                                    <div className="font-semibold">Local AI (Ollama)</div>
                                    <div className="text-xs text-muted-foreground">
                                        Free & Private. Requires Ollama.
                                    </div>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>

                    {config.ai_provider === "openai" && (
                        <div className="space-y-2">
                            <Label htmlFor="openai_key">OpenAI API Key</Label>
                            <Input
                                id="openai_key"
                                type="password"
                                placeholder="sk-..."
                                value={config.openai_api_key || ""}
                                onChange={(e) =>
                                    setConfig({ ...config, openai_api_key: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Your key is stored securely.
                            </p>
                        </div>
                    )}

                    {config.ai_provider === "local" && (
                        <div className="space-y-2">
                            <Label htmlFor="ollama_url">Ollama Base URL</Label>
                            <Input
                                id="ollama_url"
                                placeholder="http://host.docker.internal:11434"
                                value={config.ollama_base_url || ""}
                                onChange={(e) =>
                                    setConfig({ ...config, ollama_base_url: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Must be accessible from inside Docker. Use{" "}
                                <code className="bg-muted px-1 rounded">
                                    http://host.docker.internal:11434
                                </code>{" "}
                                for Mac/Windows.
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end border-t p-4">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Server className="mr-2 h-4 w-4 animate-spin" />}
                        {!loading && <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
