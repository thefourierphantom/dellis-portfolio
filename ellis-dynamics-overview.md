# Ellis Dynamics
**Company Overview — Living Document**
*Last updated: July 13, 2026*

**Founder:** Dontavious Ellis — B.S. Electrical Engineering (Mechatronics, Robotics & Embedded Systems + Wireless Circuits & Systems), University of South Florida, expected May 2028.

---

## Mission

Ellis Dynamics builds countermeasure systems: protecting friendly platforms from electronic denial, and detecting and predicting hostile ones — proven as working hardware, not just claimed capability.

Modern reconnaissance and defense platforms fail exactly when they're needed most. GPS gets jammed or spoofed. Radio links get jammed. Both are now standard practice in contested environments, not edge cases. Ellis Dynamics exists to keep systems functioning through that denial, and to find and track the threats causing it.

---

## Two Mission Domains

### 1. ECCM — Electronic Counter-Countermeasures
Protects a friendly platform from active denial.

- **GPS-denied navigation** — dead reckoning via inertial sensing (IMU), maintaining position awareness when GPS is jammed or spoofed
- **Resilient communications** — maintaining coordination and data links under active jamming

### 2. Detect-Track
Finds and predicts the trajectory of a threat — the *Track* stage of the counter-UAS sequence (Detect → Track → Identify → Defeat).

- **Predictive tracking** — state estimation and sensor fusion (e.g., Kalman filtering) applied to flying objects
- **EO/IR sensing** (thermal, night vision) as the primary sensor input feeding the tracker
- Deliberately positioned as the foundational, mechanism-agnostic layer of counter-UAS — every eventual defeat method (jamming, net capture, kinetic) needs this layer first, regardless of which one a customer uses

---

## Core Engineering Discipline: Robotics / Mechatronics / Embedded Systems

The physical layer both mission domains run on.

1. **Embedded real-time systems** — the compute substrate (current platform: Xilinx Spartan-3 FPGA)
2. **Sensor & actuator integration** — physically integrating IMU, EO/IR, and future RF hardware onto a shared platform
3. **Precision pointing / gimbal control** — two-axis gimbal driven by predictive feedforward from the tracker's own state estimate, so the system leads a moving target instead of lagging behind it. This is where Detect-Track and Robotics stop being adjacent domains and become one system.
4. **SWaP-constrained design** — size, weight, and power discipline for small-platform deployability; the practical filter most small-platform defense proposals get screened against

**Explicitly out of scope for now:** full autonomous flight (path planning, SLAM). A real robotics subfield, but ahead of current mission scope — a decision for later, once a physical platform exists to fly.

---

## Current Development Status

| Item | Status |
|---|---|
| IMU dead-reckoning module (ECCM / navigation) | In progress — reconfirm hardware/software status before any external claim |
| Precision pointing / predictive tracking system | Design phase only — build does not start until the IMU module ships |
| LLC registration | On hold — gated on first physical deliverable |
| Public brand presence (LinkedIn, site update) | On hold — same gate |

---

## Market Position

**Near-term focus: Detect-Track / pointing.**
- No special federal authorization required to build or demonstrate a detection/tracking-only system, unlike active mitigation systems
- Addressable market: military, critical infrastructure, airports — plus a newly authorized State/Local/Tribal/Territorial (SLTT) law enforcement and corrections market under the SAFER SKIES Act (FY2026 NDAA), effective July 1, 2026
- Demand signal: DHS and the FBI recorded 600+ drone incursions into restricted airspace at U.S. World Cup host-city venues as of June 20, 2026 alone
- Mechanism-agnostic — foundational to the whole counter-UAS market regardless of which defeat method eventually wins out

**Long-term direction: Mitigation / defeat systems.**
- Real, growing market — SAFER SKIES just widened who is legally authorized to deploy defeat systems
- Gated by formal Authorized Systems List approval and materially higher capital, testing, and liability requirements
- Stated long-term direction, not a near-term build

**Regulatory note:** this space is actively being legislated. DOD's own domestic counter-UAS authority is set to expire December 31, 2026 absent Congressional extension. Recheck this section before using it in any external-facing material.

---

## Company Status

Pre-formation. No LLC, no external funding, no contracts. Solo-founder stage. First physical deliverable in progress.
