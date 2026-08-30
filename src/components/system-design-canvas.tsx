"use client";

import { useMemo, useRef, useState } from "react";
import {
  ARCHITECTURAL_NODE_DEFS,
  ARCHITECTURE_PRESETS,
  ArchitectureDiagram,
  ArchitecturalNode,
  ArchitecturalNodeType,
  analyzeArchitectureTopology,
} from "@/lib/system-design-engine";
import {
  BrainCircuit,
  CheckCircle2,
  Copy,
  Database,
  GitMerge,
  Globe,
  HardDrive,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Server,
  Shield,
  Smartphone,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

const NODE_ICONS: Record<ArchitecturalNodeType, typeof Server> = {
  client: Smartphone,
  cdn: Globe,
  api_gateway: Shield,
  load_balancer: GitMerge,
  app_server: Server,
  cache: Zap,
  message_queue: Layers,
  primary_db: Database,
  read_replica: Copy,
  object_storage: HardDrive,
  search_index: Search,
};

interface SystemDesignCanvasProps {
  diagram: ArchitectureDiagram;
  onChange: (diagram: ArchitectureDiagram) => void;
  targetScale?: string;
  onAnalyze?: () => void;
}

export function SystemDesignCanvas({
  diagram,
  onChange,
  targetScale = "10,000,000 Users",
}: SystemDesignCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement | null>(null);

  const detection = useMemo(() => {
    return analyzeArchitectureTopology(diagram, 10_000_000);
  }, [diagram]);

  // Handle Add Node
  function handleAddNode(type: ArchitecturalNodeType) {
    const def = ARCHITECTURAL_NODE_DEFS[type];
    const newNode: ArchitecturalNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      label: def.label,
      sublabel: def.defaultSublabel,
      x: 100 + (diagram.nodes.length % 5) * 60 + Math.random() * 30,
      y: 80 + Math.floor(diagram.nodes.length / 5) * 70 + Math.random() * 20,
    };

    onChange({
      nodes: [...diagram.nodes, newNode],
      edges: diagram.edges,
    });
    setSelectedNodeId(newNode.id);
  }

  // Handle Preset Selection
  function handleSelectPreset(presetIndex: number) {
    const preset = ARCHITECTURE_PRESETS[presetIndex];
    if (!preset) return;
    onChange(JSON.parse(JSON.stringify(preset.diagram)));
    setSelectedNodeId(null);
    setConnectingFromNodeId(null);
  }

  // Handle Node Selection / Connection Creation
  function handleNodeClick(nodeId: string) {
    if (connectingFromNodeId) {
      if (connectingFromNodeId !== nodeId) {
        // Create Edge
        const newEdge = {
          id: `edge-${Date.now()}`,
          from: connectingFromNodeId,
          to: nodeId,
          label: "Data Flow",
        };
        onChange({
          nodes: diagram.nodes,
          edges: [...diagram.edges, newEdge],
        });
      }
      setConnectingFromNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  }

  // Handle Delete Selected Node
  function handleDeleteSelectedNode() {
    if (!selectedNodeId) return;
    onChange({
      nodes: diagram.nodes.filter((n) => n.id !== selectedNodeId),
      edges: diagram.edges.filter((e) => e.from !== selectedNodeId && e.to !== selectedNodeId),
    });
    setSelectedNodeId(null);
  }

  // Handle Drag Start
  function handleNodeMouseDown(event: React.MouseEvent, nodeId: string) {
    event.stopPropagation();
    const node = diagram.nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y,
    });
    setSelectedNodeId(nodeId);
  }

  // Handle Dragging
  function handleCanvasMouseMove(event: React.MouseEvent) {
    if (!draggingNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newX = Math.max(20, Math.min(840, mouseX - dragOffset.x));
    const newY = Math.max(20, Math.min(380, mouseY - dragOffset.y));

    onChange({
      nodes: diagram.nodes.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)),
      edges: diagram.edges,
    });
  }

  function handleCanvasMouseUp() {
    setDraggingNodeId(null);
  }

  // Helper to find node by ID
  const nodeMap = useMemo(() => {
    const map = new Map<string, ArchitecturalNode>();
    diagram.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [diagram.nodes]);

  const selectedNode = diagram.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-white shadow-xl">
      {/* Top Toolbar: Presets & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <BrainCircuit size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Interactive Architectural Whiteboard</h3>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                {targetScale}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Drag components, draw connectors & eliminate Single Points of Failure
            </p>
          </div>
        </div>

        {/* Preset Loaders */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Presets:</span>
          {ARCHITECTURE_PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className="rounded bg-zinc-900 hover:bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-300 border border-zinc-800 transition cursor-pointer"
            >
              {idx === 0 ? "3-Tier Monolith" : idx === 1 ? "+ Redis Cache" : "10M Hyperscale"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ nodes: [], edges: [] })}
            className="flex items-center gap-1 rounded bg-zinc-900 hover:bg-rose-950/60 px-2 py-1 text-[10px] font-mono text-rose-400 border border-rose-900/30 transition cursor-pointer"
            title="Clear all nodes and connectors"
          >
            <RotateCcw size={11} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Component Palette Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 text-xs">
        <span className="text-[10px] font-mono font-bold text-purple-400 uppercase px-1">
          Add Tier:
        </span>
        {(Object.keys(ARCHITECTURAL_NODE_DEFS) as ArchitecturalNodeType[]).slice(0, 8).map((type) => {
          const def = ARCHITECTURAL_NODE_DEFS[type];
          const Icon = NODE_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleAddNode(type)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-950 hover:bg-purple-950/70 px-2.5 py-1 text-[11px] font-mono text-zinc-200 border border-zinc-800 hover:border-purple-500/50 transition cursor-pointer shadow-2xs"
            >
              <Icon size={12} className="text-purple-400" />
              <span>{def.label.split(" ")[0]}</span>
              <Plus size={10} className="text-zinc-500" />
            </button>
          );
        })}
      </div>

      {/* Interactive SVG Whiteboard Canvas */}
      <div className="relative rounded-xl border border-zinc-800 bg-[#090d16] overflow-hidden">
        {/* Grid Background Pattern */}
        <svg
          ref={canvasRef}
          viewBox="0 0 880 400"
          className="w-full h-80 cursor-crosshair select-none"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => {
            setSelectedNodeId(null);
            setConnectingFromNodeId(null);
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1f293d" strokeWidth="0.5" />
            </pattern>
            {/* Arrow Marker */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#a855f7" />
            </marker>
          </defs>

          {/* Canvas Background Grid */}
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />

          {/* Render Directional Edges */}
          {diagram.edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            // Compute connection points (center-to-center offset)
            const x1 = fromNode.x + 65;
            const y1 = fromNode.y + 24;
            const x2 = toNode.x + 65;
            const y2 = toNode.y + 24;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={edge.id} className="cursor-pointer group">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                  className="transition-all group-hover:stroke-purple-300"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill="#e2e8f0"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="bg-zinc-900 px-1 font-bold"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {diagram.nodes.map((node) => {
            const def = ARCHITECTURAL_NODE_DEFS[node.type] || ARCHITECTURAL_NODE_DEFS.app_server;
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingFromNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.id);
                }}
                className="cursor-move"
              >
                {/* Node Outer Shell Box */}
                <rect
                  width="130"
                  height="48"
                  rx="8"
                  fill="#0f172a"
                  stroke={isSelected ? "#ec4899" : isConnecting ? "#a855f7" : "#334155"}
                  strokeWidth={isSelected ? "2.5" : "1.5"}
                  className="transition-all hover:stroke-purple-400 filter drop-shadow-md"
                />

                {/* Left Color Accent Bar */}
                <rect width="5" height="48" rx="2" fill="#8b5cf6" />

                {/* Node Title */}
                <text
                  x="14"
                  y="20"
                  fill="#ffffff"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {node.label.length > 16 ? node.label.substring(0, 15) + "…" : node.label}
                </text>

                {/* Node Sublabel */}
                <text
                  x="14"
                  y="36"
                  fill="#94a3b8"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {node.sublabel ? (node.sublabel.length > 18 ? node.sublabel.substring(0, 17) + "…" : node.sublabel) : def.defaultSublabel}
                </text>

                {/* Connector Pin / Active Node Ring */}
                {isSelected && (
                  <circle
                    cx="124"
                    cy="24"
                    r="4.5"
                    fill="#ec4899"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Node Action Bar (when node is selected) */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-zinc-900/95 p-2 px-3 border border-zinc-700 backdrop-blur text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono">{selectedNode.label}</span>
              <span className="text-[10px] text-zinc-400 font-mono">({selectedNode.sublabel})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConnectingFromNodeId(selectedNode.id)}
                className={`rounded px-2.5 py-1 text-[10px] font-mono font-bold transition cursor-pointer ${
                  connectingFromNodeId === selectedNode.id
                    ? "bg-purple-600 text-white animate-pulse"
                    : "bg-zinc-800 text-purple-300 hover:bg-zinc-700"
                }`}
              >
                {connectingFromNodeId === selectedNode.id ? "Click Target Node to Connect" : "+ Connect Arrow"}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedNode}
                className="flex items-center gap-1 rounded bg-rose-950/60 hover:bg-rose-900 px-2 py-1 text-[10px] font-mono text-rose-300 border border-rose-800/40 transition cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Architecture Component Detection Bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300 font-mono uppercase text-[11px]">
              Live Component Detection:
            </span>
            <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
              detection.scalabilityRating.includes("Hyperscale")
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : detection.scalabilityRating.includes("Decoupled")
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}>
              {detection.scalabilityRating}
            </span>
          </div>

          {detection.singlePointOfFailure && (
            <span className="rounded bg-rose-950/80 text-rose-300 border border-rose-800/40 px-2 py-0.5 text-[10px] font-mono font-bold">
              ⚠ Single Point of Failure (SPOF)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
          {/* Detected Components List */}
          <div className="space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1 text-[10px] uppercase">
              <CheckCircle2 size={12} />
              Components Detected ({detection.detected.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              {detection.detected.map((d) => (
                <span
                  key={d.type}
                  className="rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-300 border border-emerald-500/30 shadow-2xs"
                >
                  ✓ {d.label}
                </span>
              ))}
            </div>
          </div>

          {/* Missing Tiers List */}
          <div className="space-y-1">
            <span className="font-bold text-amber-400 flex items-center gap-1 text-[10px] uppercase">
              <XCircle size={12} />
              Missing Scaling Tiers ({detection.missing.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              {detection.missing.map((m) => (
                <span
                  key={m.type}
                  className="rounded bg-rose-950/50 px-2 py-0.5 text-rose-300 border border-rose-500/30 shadow-2xs"
                  title={m.impact}
                >
                  ✗ {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
