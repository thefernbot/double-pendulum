"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Plus, Minus, Info } from "lucide-react";

interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
  trail: { x: number; y: number }[];
  color: string;
}

interface SimParams {
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  g: number;
  damping: number;
}

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

const MAX_TRAIL_LENGTH = 500;

export default function DoublePendulum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const pendulumStatesRef = useRef<PendulumState[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [params, setParams] = useState<SimParams>({
    m1: 1,
    m2: 1,
    l1: 120,
    l2: 100,
    g: 9.81,
    damping: 0,
  });
  const [pendulumCount, setPendulumCount] = useState(1);
  const [speed, setSpeed] = useState(1);

  // Initialize pendulums with slightly different initial conditions
  const initializePendulums = useCallback((count: number) => {
    const states: PendulumState[] = [];
    const baseAngle1 = Math.PI / 2;
    const baseAngle2 = Math.PI / 2;
    
    for (let i = 0; i < count; i++) {
      // Tiny differences in initial angle (0.001 radians ~ 0.06 degrees)
      const offset = i * 0.001;
      states.push({
        theta1: baseAngle1 + offset,
        theta2: baseAngle2,
        omega1: 0,
        omega2: 0,
        trail: [],
        color: COLORS[i % COLORS.length],
      });
    }
    pendulumStatesRef.current = states;
  }, []);

  // Runge-Kutta 4th order integration for double pendulum
  const derivatives = useCallback(
    (theta1: number, theta2: number, omega1: number, omega2: number) => {
      const { m1, m2, l1, l2, g, damping } = params;
      
      const delta = theta2 - theta1;
      const den1 = (m1 + m2) * l1 - m2 * l1 * Math.cos(delta) * Math.cos(delta);
      const den2 = (l2 / l1) * den1;

      const dtheta1 = omega1;
      const dtheta2 = omega2;

      const domega1 =
        (m2 * l1 * omega1 * omega1 * Math.sin(delta) * Math.cos(delta) +
          m2 * g * Math.sin(theta2) * Math.cos(delta) +
          m2 * l2 * omega2 * omega2 * Math.sin(delta) -
          (m1 + m2) * g * Math.sin(theta1) -
          damping * omega1) /
        den1;

      const domega2 =
        (-m2 * l2 * omega2 * omega2 * Math.sin(delta) * Math.cos(delta) +
          (m1 + m2) * g * Math.sin(theta1) * Math.cos(delta) -
          (m1 + m2) * l1 * omega1 * omega1 * Math.sin(delta) -
          (m1 + m2) * g * Math.sin(theta2) -
          damping * omega2) /
        den2;

      return { dtheta1, dtheta2, domega1, domega2 };
    },
    [params]
  );

  const rk4Step = useCallback(
    (state: PendulumState, dt: number): PendulumState => {
      const { theta1, theta2, omega1, omega2 } = state;

      // k1
      const k1 = derivatives(theta1, theta2, omega1, omega2);

      // k2
      const k2 = derivatives(
        theta1 + (k1.dtheta1 * dt) / 2,
        theta2 + (k1.dtheta2 * dt) / 2,
        omega1 + (k1.domega1 * dt) / 2,
        omega2 + (k1.domega2 * dt) / 2
      );

      // k3
      const k3 = derivatives(
        theta1 + (k2.dtheta1 * dt) / 2,
        theta2 + (k2.dtheta2 * dt) / 2,
        omega1 + (k2.domega1 * dt) / 2,
        omega2 + (k2.domega2 * dt) / 2
      );

      // k4
      const k4 = derivatives(
        theta1 + k3.dtheta1 * dt,
        theta2 + k3.dtheta2 * dt,
        omega1 + k3.domega1 * dt,
        omega2 + k3.domega2 * dt
      );

      return {
        ...state,
        theta1: theta1 + ((k1.dtheta1 + 2 * k2.dtheta1 + 2 * k3.dtheta1 + k4.dtheta1) * dt) / 6,
        theta2: theta2 + ((k1.dtheta2 + 2 * k2.dtheta2 + 2 * k3.dtheta2 + k4.dtheta2) * dt) / 6,
        omega1: omega1 + ((k1.domega1 + 2 * k2.domega1 + 2 * k3.domega1 + k4.domega1) * dt) / 6,
        omega2: omega2 + ((k1.domega2 + 2 * k2.domega2 + 2 * k3.domega2 + k4.domega2) * dt) / 6,
      };
    },
    [derivatives]
  );

  const calculateEnergy = useCallback(
    (state: PendulumState) => {
      const { m1, m2, l1, l2, g } = params;
      const { theta1, theta2, omega1, omega2 } = state;

      // Positions
      const y1 = -l1 * Math.cos(theta1);
      const y2 = y1 - l2 * Math.cos(theta2);

      // Velocities
      const v1x = l1 * omega1 * Math.cos(theta1);
      const v1y = l1 * omega1 * Math.sin(theta1);
      const v2x = v1x + l2 * omega2 * Math.cos(theta2);
      const v2y = v1y + l2 * omega2 * Math.sin(theta2);

      // Kinetic energy
      const KE = 0.5 * m1 * (v1x * v1x + v1y * v1y) + 0.5 * m2 * (v2x * v2x + v2y * v2y);

      // Potential energy (reference at pivot)
      const PE = m1 * g * y1 + m2 * g * y2;

      return { KE, PE, total: KE + PE };
    },
    [params]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { l1, l2 } = params;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 50;

    // Clear canvas
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw trails first (behind pendulums)
    if (showTrails) {
      pendulumStatesRef.current.forEach((state) => {
        if (state.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = state.color;
          ctx.lineWidth = 1.5;
          
          for (let i = 0; i < state.trail.length - 1; i++) {
            const alpha = i / state.trail.length;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(state.trail[i].x, state.trail[i].y);
            ctx.lineTo(state.trail[i + 1].x, state.trail[i + 1].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      });
    }

    // Draw pivot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#71717a";
    ctx.fill();

    // Draw each pendulum
    pendulumStatesRef.current.forEach((state, index) => {
      const x1 = centerX + l1 * Math.sin(state.theta1);
      const y1 = centerY + l1 * Math.cos(state.theta1);
      const x2 = x1 + l2 * Math.sin(state.theta2);
      const y2 = y1 + l2 * Math.cos(state.theta2);

      // Update trail
      state.trail.push({ x: x2, y: y2 });
      if (state.trail.length > MAX_TRAIL_LENGTH) {
        state.trail.shift();
      }

      // Draw rods
      ctx.beginPath();
      ctx.strokeStyle = state.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = pendulumStatesRef.current.length > 1 ? 0.7 : 1;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw masses
      ctx.beginPath();
      ctx.arc(x1, y1, 8, 0, Math.PI * 2);
      ctx.fillStyle = state.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, 10, 0, Math.PI * 2);
      ctx.fillStyle = state.color;
      ctx.fill();

      ctx.globalAlpha = 1;
    });
  }, [params, showTrails]);

  const animate = useCallback(() => {
    const dt = 0.016 * speed; // ~60fps adjusted by speed
    const substeps = 4;
    const subDt = dt / substeps;

    // Update physics with substeps for stability
    for (let step = 0; step < substeps; step++) {
      pendulumStatesRef.current = pendulumStatesRef.current.map((state) =>
        rk4Step(state, subDt)
      );
    }

    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [rk4Step, draw, speed]);

  // Initialize on mount
  useEffect(() => {
    initializePendulums(pendulumCount);
    draw();
  }, []);

  // Handle pendulum count changes
  useEffect(() => {
    initializePendulums(pendulumCount);
    if (!isPlaying) {
      draw();
    }
  }, [pendulumCount, initializePendulums, draw, isPlaying]);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handleReset = () => {
    setIsPlaying(false);
    initializePendulums(pendulumCount);
    setTimeout(draw, 0);
  };

  const addPendulum = () => {
    if (pendulumCount < 8) {
      setPendulumCount((c) => c + 1);
    }
  };

  const removePendulum = () => {
    if (pendulumCount > 1) {
      setPendulumCount((c) => c - 1);
    }
  };

  const energy = pendulumStatesRef.current[0]
    ? calculateEnergy(pendulumStatesRef.current[0])
    : { KE: 0, PE: 0, total: 0 };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Double Pendulum
          </h1>
          <p className="text-zinc-400 mt-1">
            Chaos theory in motion — tiny differences create wildly different paths
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-2">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={550}
                  className="w-full rounded-md"
                  style={{ maxHeight: "550px" }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    variant="outline"
                    className="flex-1"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-400">Pendulums</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={removePendulum}
                        disabled={pendulumCount <= 1}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center">{pendulumCount}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addPendulum}
                        disabled={pendulumCount >= 8}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Each differs by 0.001 rad (0.06°)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="trails" className="text-sm text-zinc-400">
                    Show Trails
                  </Label>
                  <Switch
                    id="trails"
                    checked={showTrails}
                    onCheckedChange={setShowTrails}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm text-zinc-400">Speed</Label>
                    <span className="text-sm text-zinc-500">{speed}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={([v]) => setSpeed(v)}
                    min={0.25}
                    max={3}
                    step={0.25}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm text-zinc-400">Length 1</Label>
                    <span className="text-sm text-zinc-500">{params.l1}px</span>
                  </div>
                  <Slider
                    value={[params.l1]}
                    onValueChange={([v]) => {
                      setParams((p) => ({ ...p, l1: v }));
                      if (!isPlaying) handleReset();
                    }}
                    min={50}
                    max={200}
                    step={10}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm text-zinc-400">Length 2</Label>
                    <span className="text-sm text-zinc-500">{params.l2}px</span>
                  </div>
                  <Slider
                    value={[params.l2]}
                    onValueChange={([v]) => {
                      setParams((p) => ({ ...p, l2: v }));
                      if (!isPlaying) handleReset();
                    }}
                    min={50}
                    max={200}
                    step={10}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm text-zinc-400">Gravity</Label>
                    <span className="text-sm text-zinc-500">{params.g.toFixed(1)} m/s²</span>
                  </div>
                  <Slider
                    value={[params.g]}
                    onValueChange={([v]) => setParams((p) => ({ ...p, g: v }))}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm text-zinc-400">Damping</Label>
                    <span className="text-sm text-zinc-500">{params.damping.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[params.damping]}
                    onValueChange={([v]) => setParams((p) => ({ ...p, damping: v }))}
                    min={0}
                    max={0.5}
                    step={0.01}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Energy</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInfo(!showInfo)}
                    className="h-7 w-7 p-0"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Kinetic</span>
                  <span className="font-mono">{energy.KE.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Potential</span>
                  <span className="font-mono">{energy.PE.toFixed(1)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2">
                  <span className="text-zinc-400">Total</span>
                  <span className="font-mono">{energy.total.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            {showInfo && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">About</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-400 space-y-2">
                  <p>
                    A double pendulum is a classic example of a chaotic system. Even
                    though it follows deterministic physics, its motion is extremely
                    sensitive to initial conditions.
                  </p>
                  <p>
                    Try adding multiple pendulums — they start nearly identical but
                    quickly diverge. This is the &quot;butterfly effect&quot; in action.
                  </p>
                  <p>
                    The simulation uses 4th-order Runge-Kutta integration for accuracy.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
