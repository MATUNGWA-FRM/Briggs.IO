import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw, Search } from 'lucide-react';
import {
  EDGE_RELATIONSHIP_COLORS,
  WALLET_CLASSIFICATION_COLORS,
  type BubbleMapNode,
  type BubbleMapPayload,
} from '../server/graph/bubbleMapBuilder';
import type { WalletEdge } from '../shared/types';
import { BubbleLegend, WalletInspectorCard } from './WalletInspectorCard';

interface BubbleMap3DProps {
  graph: BubbleMapPayload;
  selectedWallet: BubbleMapNode | null;
  onSelectWallet: (w: BubbleMapNode | null) => void;
  heightClassName?: string;
}

const _vec3 = new THREE.Vector3();
const _targetFocus = new THREE.Vector3();

const ALL_ROLES = ['ALL', ...Object.keys(WALLET_CLASSIFICATION_COLORS)] as const;
const RELATIONSHIP_FILTERS: Array<'ALL' | WalletEdge['relationship']> = [
  'ALL',
  'funding',
  'transfer',
  'acquisition',
  'detected_relationship',
];

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const BubbleMap3D: React.FC<BubbleMap3DProps> = ({
  graph,
  selectedWallet,
  onSelectWallet,
  heightClassName = 'h-[400px]',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelectWallet);
  onSelectRef.current = onSelectWallet;

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<'ALL' | WalletEdge['relationship']>('ALL');
  const [clusterFilter, setClusterFilter] = useState<string>('');
  const [sizeMetric, setSizeMetric] = useState<'supply' | 'usd'>('supply');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEdges, setShowEdges] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<BubbleMapNode | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [resetTick, setResetTick] = useState(0);

  const focusNodeRef = useRef<BubbleMapNode | null>(null);
  const requestRenderFnRef = useRef<(() => void) | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);

  const visibleNodes = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (roleFilter !== 'ALL' && n.classification !== roleFilter) return false;
      if (clusterFilter && n.cluster_id !== clusterFilter && n.classification !== 'LP') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          n.address.toLowerCase().includes(q) ||
          n.short_address.toLowerCase().includes(q) ||
          n.classification.toLowerCase().includes(q) ||
          (n.cluster_id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [graph.nodes, roleFilter, clusterFilter, searchTerm]);

  const visibleEdges = useMemo(() => {
    if (!showEdges) return [];
    const visibleIdSet = new Set(visibleNodes.map((n) => n.id));
    return graph.edges.filter((e) => {
      if (!visibleIdSet.has(e.source) || !visibleIdSet.has(e.target)) return false;
      if (relationshipFilter !== 'ALL' && e.relationship !== relationshipFilter) return false;
      return true;
    });
  }, [graph.edges, visibleNodes, showEdges, relationshipFilter]);

  useEffect(() => {
    focusNodeRef.current = selectedWallet;
    const halo = selectionRingRef.current;
    if (halo) {
      if (selectedWallet) {
        const rad = sizeMetric === 'usd' ? selectedWallet.radius_usd : selectedWallet.radius;
        halo.visible = true;
        halo.position.set(selectedWallet.x3d, selectedWallet.y3d, selectedWallet.z3d);
        halo.scale.setScalar(rad * 1.55);
      } else {
        halo.visible = false;
      }
    }
    requestRenderFnRef.current?.();
  }, [selectedWallet, sizeMetric]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    setWebglError(null);
    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 400;

    let renderer: THREE.WebGLRenderer;
    let envTex: THREE.Texture | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      setWebglError(`WebGL unavailable in this browser context (${String(err)}). Use 2D Cytoscape mode.`);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e14);
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.015);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 220);
    camera.position.set(16, 12, 23);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio environment map for PBR reflections
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
    } catch {
      // Fallback safely to directional + hemisphere lights if PMREM fails
    }

    // Warm key light + cool HemisphereLight fill
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
    keyLight.position.set(14, 22, 16);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.9);
    scene.add(hemiLight);

    // Subtle spatial reference grid
    const grid = new THREE.GridHelper(32, 16, 0x1e293b, 0x111827);
    grid.position.y = -12.5;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 60;

    // Build composite 3-part wallet nodes & edges
    const nodeGroup = new THREE.Group();
    const edgeGroup = new THREE.Group();
    scene.add(nodeGroup);
    scene.add(edgeGroup);

    const disposables: Array<{ dispose: () => void }> = [];
    const clickableProxies: THREE.Mesh[] = [];

    const baseSphereGeo = new THREE.SphereGeometry(1, 24, 18);
    const ringGeo = new THREE.TorusGeometry(1.36, 0.06, 10, 32);
    const capGeo = new THREE.CylinderGeometry(0.3, 0.42, 0.24, 16);
    const haloGeo = new THREE.TorusGeometry(1.22, 0.05, 12, 36);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    disposables.push(baseSphereGeo, ringGeo, capGeo, haloGeo, haloMat);

    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.visible = false;
    scene.add(haloMesh);
    selectionRingRef.current = haloMesh;

    for (const node of visibleNodes) {
      const nodeRadius = sizeMetric === 'usd' ? node.radius_usd : node.radius;
      const group = new THREE.Group();
      group.position.set(node.x3d, node.y3d, node.z3d);

      const primaryMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(node.color),
        roughness: node.classification === 'LP' ? 0.16 : 0.28,
        metalness: node.classification === 'LP' ? 0.72 : 0.42,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2,
      });
      const ringMat = new THREE.MeshStandardMaterial({
        color: node.cluster_id ? 0xf59e0b : 0x38bdf8,
        roughness: 0.55,
        metalness: 0.25,
      });
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.4,
        metalness: 0.75,
      });
      disposables.push(primaryMat, ringMat, capMat);

      const core = new THREE.Mesh(baseSphereGeo, primaryMat);
      core.scale.setScalar(nodeRadius);
      core.userData.walletNode = node;
      core.layers.enable(1);
      clickableProxies.push(core);
      group.add(core);

      // Secondary silhouette: equatorial ring
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.scale.setScalar(nodeRadius);
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);

      // Accent detail: top node polar cap
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.scale.setScalar(nodeRadius);
      cap.position.y = nodeRadius * 0.96;
      group.add(cap);

      nodeGroup.add(group);
    }

    if (selectedWallet) {
      const active = visibleNodes.find((n) => n.id === selectedWallet.id);
      if (active) {
        const rad = sizeMetric === 'usd' ? active.radius_usd : active.radius;
        haloMesh.visible = true;
        haloMesh.position.set(active.x3d, active.y3d, active.z3d);
        haloMesh.scale.setScalar(rad * 1.55);
      }
    }

    const nodeMap = new Map(visibleNodes.map((n) => [n.id, n]));
    for (const edge of visibleEdges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const pts = [new THREE.Vector3(a.x3d, a.y3d, a.z3d), new THREE.Vector3(b.x3d, b.y3d, b.z3d)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const edgeColorHex = EDGE_RELATIONSHIP_COLORS[edge.relationship] || '#A855F7';
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(edgeColorHex),
        transparent: true,
        opacity: 0.72,
      });
      disposables.push(lineGeo, lineMat);
      edgeGroup.add(new THREE.Line(lineGeo, lineMat));
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();

    let isTransitioning = false;
    let userInteracting = false;
    let frameId = 0;
    let timeoutId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        timeoutId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!sync) {
          timeoutId = window.setTimeout(cb, 80);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        if (isTransitioning && !userInteracting && focusNodeRef.current) {
          const fn = focusNodeRef.current;
          _targetFocus.set(fn.x3d, fn.y3d, fn.z3d);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetFocus.x, 6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetFocus.y, 6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetFocus.z, 6, delta);
          _vec3.copy(controls.target);
          if (_vec3.distanceTo(_targetFocus) < 0.05) {
            isTransitioning = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderFnRef.current = requestRender;
    requestRender();

    controls.addEventListener('start', () => {
      userInteracting = true;
      isTransitioning = false;
    });
    controls.addEventListener('end', () => {
      userInteracting = false;
    });
    controls.addEventListener('change', requestRender);

    const updateMouse = (e: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    let lastHoverTs = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastHoverTs < 60) return;
      lastHoverTs = now;
      updateMouse(e);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const w = hits[0].object.userData.walletNode as BubbleMapNode;
        renderer.domElement.style.cursor = 'pointer';
        setHoveredInfo(w);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredInfo(null);
      }
    };

    const onClick = (e: MouseEvent) => {
      updateMouse(e);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const w = hits[0].object.userData.walletNode as BubbleMapNode;
        focusNodeRef.current = w;
        isTransitioning = true;
        onSelectRef.current(w);
        requestRender();
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      envTex?.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      selectionRingRef.current = null;
      requestRenderFnRef.current = null;
    };
  }, [visibleNodes, visibleEdges, sizeMetric, resetTick, selectedWallet?.id]);

  const handleResetView = () => {
    onSelectWallet(null);
    setRoleFilter('ALL');
    setRelationshipFilter('ALL');
    setClusterFilter('');
    setSearchTerm('');
    setShowEdges(true);
    setResetTick((v) => v + 1);
  };

  return (
    <div className="space-y-2.5">
      <div className={`relative ${heightClassName} w-full rounded border border-[#1E2330] bg-[#08090D] overflow-hidden`}>
        {/* Isolated Three.js Mount Container */}
        <div ref={mountRef} className="w-full h-full" />

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#0B0E14] text-xs text-amber-300 text-center">
            {webglError}
          </div>
        )}

        {/* Minimal Top-Left Info (Static, No Pulsing Dots) */}
        <div className="absolute top-2.5 left-3 px-2.5 py-1 rounded bg-[#111622]/95 border border-slate-800 text-[11px] font-mono text-slate-300 pointer-events-none tabular-nums">
          3D Wallet Topology · {visibleNodes.length} nodes · {visibleEdges.length} links · Drag rotate · Scroll zoom
        </div>

        {/* Hover Tooltip (Solid Surface, No backdrop-blur over WebGL) */}
        {hoveredInfo && (
          <div className="absolute top-2.5 right-3 px-3 py-2 rounded bg-[#0C0E14] border border-[#1E2330] text-xs font-mono pointer-events-none">
            <div className="text-slate-100 font-semibold">{hoveredInfo.classification}</div>
            <div className="text-slate-400 text-[11px]">{hoveredInfo.short_address}</div>
            <div className="text-sky-300 text-[11px] tabular-nums">
              Supply {hoveredInfo.supply_pct}% · Risk {hoveredInfo.risk_score}/100
            </div>
          </div>
        )}

        {/* Collapsible Bottom Control Dock (Zero Mid-Flank Occlusion) */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center max-w-[96%]">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="px-2.5 py-0.5 text-[10px] font-mono text-slate-300 bg-[#111622] border border-b-0 border-slate-700 rounded-t flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {dockCollapsed ? 'Show Controls' : 'Hide Controls'}
          </button>

          {!dockCollapsed && (
            <div className="px-3 py-1.5 rounded bg-[#0C0E14] border border-[#1E2330] flex flex-wrap items-center justify-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find wallet..."
                  className="bg-[#0B0E14] border border-slate-800 rounded pl-6 pr-2 py-1 text-[11px] font-mono text-slate-200 w-32 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                aria-label="Filter 3D nodes by classification"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ALL' ? 'All Roles' : r}
                  </option>
                ))}
              </select>

              <select
                value={relationshipFilter}
                onChange={(e) => setRelationshipFilter(e.target.value as 'ALL' | WalletEdge['relationship'])}
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                aria-label="Filter 3D edges by relationship"
              >
                {RELATIONSHIP_FILTERS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel === 'ALL' ? 'All Links' : rel}
                  </option>
                ))}
              </select>

              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value)}
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200"
                aria-label="Filter 3D nodes by cluster"
              >
                <option value="">All Clusters</option>
                {graph.clusters.map((c) => (
                  <option key={c.cluster_id} value={c.cluster_id}>
                    {c.cluster_id}
                  </option>
                ))}
              </select>

              <select
                value={sizeMetric}
                onChange={(e) => setSizeMetric(e.target.value as 'supply' | 'usd')}
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                aria-label="3D node size metric"
              >
                <option value="supply">Supply %</option>
                <option value="usd">USD Value</option>
              </select>

              <button
                type="button"
                onClick={() => setShowEdges((v) => !v)}
                className="px-2 py-1 text-[11px] border border-[#1E2330] bg-[#08090D] hover:bg-slate-800 text-slate-300 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {showEdges ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Links
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className="px-2 py-1 text-[11px] border border-[#1E2330] bg-[#08090D] hover:bg-slate-800 text-slate-300 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <BubbleLegend
        visibleNodes={graph.nodes}
        activeRole={roleFilter}
        onSelectRole={setRoleFilter}
      />

      <WalletInspectorCard
        graph={graph}
        selectedWallet={selectedWallet}
        onSelectWallet={onSelectWallet}
      />
    </div>
  );
};
