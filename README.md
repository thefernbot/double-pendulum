# Double Pendulum

Interactive chaos theory simulation demonstrating how a double pendulum exhibits sensitive dependence on initial conditions.

**Live:** https://double-pendulum-rose.vercel.app

## Features

- Real-time physics simulation using 4th-order Runge-Kutta integration
- Multiple pendulums with near-identical starting conditions to visualize chaos divergence
- Trail visualization showing path history
- Adjustable parameters: arm lengths, gravity, damping
- Real-time energy tracking (kinetic, potential, total)
- Play/pause controls with adjustable speed

## The Butterfly Effect

Add multiple pendulums — they start with differences of just 0.001 radians (0.06 degrees). Watch as these nearly identical systems quickly diverge into completely different trajectories. This is deterministic chaos: the same physics, wildly different outcomes.

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React icons

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Physics

The double pendulum is governed by coupled second-order differential equations. Despite being fully deterministic, the system is chaotic — small perturbations grow exponentially, making long-term prediction impossible.

The simulation uses 4th-order Runge-Kutta with substeps for numerical stability at high speeds.
