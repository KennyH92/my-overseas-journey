import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Database, MapPin } from "lucide-react";
import { format } from "date-fns";

interface ParsedRecord {
  readerNum: string;
  patrolTime: Date;
  person: string;
  checkpoint: string;
  event: string;
}

interface ImportPreview {
  records: ParsedRecord[];
  checkpoints: string[];
  dateRange: { start: Date; end: Date };
  totalRecords: number;
}

export default function DataImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  // Fetch sites for mapping
  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing checkpoints
  const { data: existingCheckpoints = [] } = useQuery({
    queryKey: ["checkpoints", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const { data, error } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("site_id", selectedSiteId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSiteId,
  });

  const parseDate = (dateStr: string): Date => {
    // Handle format like "1/11/2025 12:00:22 AM"
    const parts = dateStr.trim().split(" ");
    if (parts.length < 2) return new Date();
    
    const datePart = parts[0];
    const timePart = parts[1];
    const ampm = parts[2] || "";
    
    const [day, month, year] = datePart.split("/").map(Number);
    let [hours, minutes, seconds] = timePart.split(":").map(Number);
    
    if (ampm.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }
    
    return new Date(year, month - 1, day, hours, minutes, seconds || 0);
  };

  const parseRecordLine = (line: string): ParsedRecord | null => {
    // Parse table row format: | ReaderNum | Patrol Time | Person | Checkpoint | Event |
    const parts = line.split("|").map(p => p.trim()).filter(p => p);
    if (parts.length < 4) return null;
    
    const readerNum = parts[0];
    const patrolTimeStr = parts[1];
    const person = parts[2] || "";
    const checkpoint = parts[3];
    const event = parts[4] || "";
    
    // Skip header rows
    if (readerNum === "ReaderNum" || readerNum.includes("-")) return null;
    
    try {
      const patrolTime = parseDate(patrolTimeStr);
      if (isNaN(patrolTime.getTime())) return null;
      
      return {
        readerNum,
        patrolTime,
        person,
        checkpoint,
        event,
      };
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setParsing(true);
    setPreview(null);
    setImportResult(null);
    
    try {
      // Read file as text (for now, we'll parse the markdown output)
      const text = await selectedFile.text();
      const lines = text.split("\n");
      
      const records: ParsedRecord[] = [];
      const checkpointSet = new Set<string>();
      
      for (const line of lines) {
        if (line.includes("|")) {
          const record = parseRecordLine(line);
          if (record) {
            records.push(record);
            checkpointSet.add(record.checkpoint);
          }
        }
      }
      
      if (records.length === 0) {
        toast({
          title: "No records found",
          description: "Could not parse any patrol records from the file.",
          variant: "destructive",
        });
        setParsing(false);
        return;
      }
      
      // Sort by time
      records.sort((a, b) => a.patrolTime.getTime() - b.patrolTime.getTime());
      
      setPreview({
        records,
        checkpoints: Array.from(checkpointSet).sort(),
        dateRange: {
          start: records[0].patrolTime,
          end: records[records.length - 1].patrolTime,
        },
        totalRecords: records.length,
      });
      
      toast({
        title: "File parsed",
        description: `Found ${records.length} patrol records with ${checkpointSet.size} unique checkpoints.`,
      });
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Parse error",
        description: "Failed to parse the file. Please ensure it's a valid patrol record export.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !selectedSiteId) {
      toast({
        title: "Missing information",
        description: "Please select a site before importing.",
        variant: "destructive",
      });
      return;
    }
    
    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      // Create checkpoints if they don't exist
      const existingNames = new Set(existingCheckpoints.map(c => c.name));
      const newCheckpoints = preview.checkpoints.filter(name => !existingNames.has(name));
      
      if (newCheckpoints.length > 0) {
        const checkpointInserts = newCheckpoints.map((name, index) => ({
          name,
          site_id: selectedSiteId,
          code: name.replace(/\s+/g, "_").toUpperCase(),
          order_index: existingCheckpoints.length + index,
          status: "active",
        }));
        
        const { error: cpError } = await supabase
          .from("checkpoints")
          .insert(checkpointInserts);
        
        if (cpError) {
          console.error("Checkpoint insert error:", cpError);
          toast({
            title: "Checkpoint creation failed",
            description: cpError.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Checkpoints created",
            description: `Created ${newCheckpoints.length} new checkpoints.`,
          });
        }
      }
      
      // Refetch checkpoints
      const { data: allCheckpoints } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("site_id", selectedSiteId);
      
      const checkpointMap = new Map(allCheckpoints?.map(c => [c.name, c.id]) || []);
      
      // Group records by patrol session (90-minute windows based on the summary report)
      const sessions: ParsedRecord[][] = [];
      let currentSession: ParsedRecord[] = [];
      let sessionStart: Date | null = null;
      
      for (const record of preview.records) {
        if (!sessionStart || record.patrolTime.getTime() - sessionStart.getTime() > 90 * 60 * 1000) {
          if (currentSession.length > 0) {
            sessions.push(currentSession);
          }
          currentSession = [record];
          sessionStart = record.patrolTime;
        } else {
          currentSession.push(record);
        }
      }
      if (currentSession.length > 0) {
        sessions.push(currentSession);
      }
      
      // Create patrol reports for each session
      for (const session of sessions) {
        const startTime = session[0].patrolTime;
        const endTime = session[session.length - 1].patrolTime;
        
        // Create patrol report
        const { data: report, error: reportError } = await supabase
          .from("patrol_reports")
          .insert({
            site_id: selectedSiteId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: "completed",
            notes: `Imported from ${file?.name || "external file"}`,
          })
          .select()
          .single();
        
        if (reportError || !report) {
          console.error("Report insert error:", reportError);
          failCount += session.length;
          continue;
        }
        
        // Create checkpoint visits
        for (const record of session) {
          const checkpointId = checkpointMap.get(record.checkpoint);
          if (!checkpointId) {
            failCount++;
            continue;
          }
          
          const { error: visitError } = await supabase
            .from("patrol_report_checkpoints")
            .insert({
              report_id: report.id,
              checkpoint_id: checkpointId,
              visited_at: record.patrolTime.toISOString(),
              status: "completed",
              notes: record.event || null,
            });
          
          if (visitError) {
            console.error("Visit insert error:", visitError);
            failCount++;
          } else {
            successCount++;
          }
        }
      }
      
      setImportResult({ success: successCount, failed: failCount });
      queryClient.invalidateQueries({ queryKey: ["patrol_reports"] });
      queryClient.invalidateQueries({ queryKey: ["checkpoints"] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} records. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground">Import patrol records from external systems</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload a patrol record export file (TXT, CSV, or parsed PDF content)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                accept=".txt,.csv,.md"
                onChange={handleFileSelect}
                disabled={parsing || importing}
              />
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
            
            {parsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Target Site
            </CardTitle>
            <CardDescription>
              Select which site to import the patrol data to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSiteId && (
              <div className="text-sm text-muted-foreground">
                Existing checkpoints: {existingCheckpoints.length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Preview
            </CardTitle>
            <CardDescription>
              Review the data before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold">{preview.totalRecords}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Unique Checkpoints</div>
                <div className="text-2xl font-bold">{preview.checkpoints.length}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Date Range Start</div>
                <div className="text-lg font-medium">{format(preview.dateRange.start, "yyyy/MM/dd HH:mm")}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Date Range End</div>
                <div className="text-lg font-medium">{format(preview.dateRange.end, "yyyy/MM/dd HH:mm")}</div>
              </div>
            </div>

            {/* Checkpoints */}
            <div>
              <h4 className="mb-2 font-medium">Checkpoints to be created/matched:</h4>
              <div className="flex flex-wrap gap-2">
                {preview.checkpoints.map((cp) => {
                  const exists = existingCheckpoints.some(ec => ec.name === cp);
                  return (
                    <Badge key={cp} variant={exists ? "secondary" : "default"}>
                      {cp} {exists && "(exists)"}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Sample Records */}
            <div>
              <h4 className="mb-2 font-medium">Sample Records (first 10):</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reader #</TableHead>
                      <TableHead>Patrol Time</TableHead>
                      <TableHead>Checkpoint</TableHead>
                      <TableHead>Event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.records.slice(0, 10).map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{record.readerNum}</TableCell>
                        <TableCell>{format(record.patrolTime, "yyyy/MM/dd HH:mm:ss")}</TableCell>
                        <TableCell>{record.checkpoint}</TableCell>
                        <TableCell>{record.event || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Import Button */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleImport} 
                disabled={importing || !selectedSiteId}
                className="min-w-[150px]"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>
              
              {!selectedSiteId && (
                <span className="text-sm text-muted-foreground">
                  Please select a site first
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Section */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                <div className="text-sm text-green-600 dark:text-green-400">Successful</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{importResult.success}</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{importResult.failed}</div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => navigate("/basic/history")}>
                View Patrol History
              </Button>
              <Button variant="outline" onClick={() => navigate("/setup/checkpoints")}>
                View Checkpoints
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
