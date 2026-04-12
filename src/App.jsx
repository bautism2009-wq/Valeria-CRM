import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & THEME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const G = {
  bg: "#07070A",
  bgGradient: "radial-gradient(ellipse at 20% 0%, #12100A 0%, #07070A 55%), radial-gradient(ellipse at 80% 100%, #0A0D12 0%, #07070A 55%)",
  surface: "#0E0E12", surfaceGlass: "rgba(14,14,18,0.75)",
  surface2: "#141418", surface3: "#1A1A20",
  border: "#1E1C16", borderGold: "rgba(201,168,76,0.18)", borderGlow: "rgba(201,168,76,0.35)",
  gold: "#C9A84C", goldLight: "#E8C97A", goldDim: "rgba(201,168,76,0.4)",
  goldGlow: "rgba(201,168,76,0.12)", goldGlow2: "rgba(201,168,76,0.06)",
  text: "#F0EAD6", textSoft: "#C4B896", textMuted: "#8A7D5E", textDim: "#3A3028",
  green: "#2E7D52", greenBg: "rgba(13,31,20,0.6)", greenBorder: "rgba(46,125,82,0.2)", greenText: "#5DBF8A",
  blue: "#1A3A5C", blueBg: "rgba(10,24,40,0.6)", blueBorder: "rgba(26,58,92,0.3)", blueText: "#6AABDF",
  danger: "#7D2E2E", dangerText: "#E06060",
  wa: "#25D366", waBg: "rgba(37,211,102,0.08)", waBorder: "rgba(37,211,102,0.2)",
};

const PIPELINE_STAGES = [
  { id: "new",          label: "Prospecto",      icon: "🎯", bg: "rgba(10,16,32,0.8)",  border: "rgba(26,58,92,0.4)",  text: "#6AABDF" },
  { id: "contacted",   label: "Contactado",      icon: "💬", bg: "rgba(12,18,30,0.8)",  border: "rgba(26,74,124,0.4)", text: "#7ABFEF" },
  { id: "negotiating", label: "Negociando",      icon: "⚡", bg: "rgba(18,16,10,0.8)",  border: "rgba(201,168,76,0.3)",text: "#C9A84C" },
  { id: "pending",     label: "Cierre Pend.",    icon: "🔥", bg: "rgba(13,23,16,0.8)",  border: "rgba(46,125,82,0.3)", text: "#5DBF8A" },
  { id: "closed",      label: "Cerrado ✓",       icon: "✓",  bg: "rgba(10,25,15,0.8)",  border: "rgba(46,125,82,0.5)", text: "#3DBF6A" },
  { id: "rejected",    label: "Rechazado",       icon: "✕",  bg: "rgba(26,10,10,0.8)",  border: "rgba(125,46,46,0.4)", text: "#E06060" },
];

const DEFAULT_PROFILE = {
  ownerName: "Bau",
  deliveryLanding: "5-7 días",
  deliveryWeb: "10-15 días",
  deliveryEcommerce: "20-30 días",
  paymentMethods: "Transferencia / MercadoPago",
  paymentTerms: "50% adelanto, 50% al entregar",
  portfolioUrl: "",
  extraNotes: "",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SYSTEM PROMPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const buildSystemPrompt = (memory, profile, prospect) => {
  let prospectBlock = "";
  if (prospect) {
    prospectBlock = `\n━━━ PROSPECTO ACTUAL ━━━
Nombre: ${prospect.prospectName || "Desconocido"}
Rubro: ${prospect.sector || "No especificado"}
Teléfono: ${prospect.phone || "No proporcionado"}
Instagram: ${prospect.instagram || "No tiene / No indicado"}
Google Maps / Dirección: ${prospect.googleMaps || "No proporcionado"}

Ya tenés toda esta información del prospecto. NO la repitas textualmente en el chat.
Si tiene Instagram o Google Maps, usá tu herramienta Google Search para investigar su negocio antes de responder.
Analizá qué venden, su estética, cómo se comunican y si se nota que les falta profesionalización web.
`;
  }

  return `Sos Valeria, Consultora Maestra de Ventas de Élite que asiste a ${profile?.ownerName || "Bau"} a vender páginas web.

━━━ PERFIL DEL NEGOCIO ━━━
Vendedor: ${profile?.ownerName || "Bau"}
Tiempos de entrega: Landing ${profile?.deliveryLanding || "5-7 días"} · Web profesional ${profile?.deliveryWeb || "10-15 días"} · E-commerce ${profile?.deliveryEcommerce || "20-30 días"}
Formas de pago: ${profile?.paymentMethods || "Transferencia / MercadoPago"}
Condiciones: ${profile?.paymentTerms || "50% adelanto, 50% al entregar"}
${profile?.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : "Portfolio: (no configurado aún)"}
${profile?.extraNotes ? `Notas extra: ${profile.extraNotes}` : ""}
${prospectBlock}
━━━ MEMORIA ACUMULADA ━━━
${memory || "Sin memoria previa aún."}

━━━ INSTRUCCIÓN DE MEMORIA ━━━
Al final de cada respuesta tuya, si aprendiste algo relevante sobre el negocio, un cliente, una objeción o un cierre exitoso, agregá:
[MEMORIA: texto breve de lo que hay que recordar]
Esta sección no la ve el cliente.

━━━ TU BIBLIOTECA ━━━
BELFORT: Control de línea, certeza absoluta, siempre avanzar al cierre.
CARDONE: Volumen masivo, persistencia, cada lead es el más importante.
VOSS: Etiquetado emocional, espejo, silencio táctico, preguntas calibradas.
CARNEGIE: Usar nombre del cliente, interés genuino, método Sócrates, nunca ganar una discusión.
SUN TZU: Conocer al cliente antes que él mismo, atacar el punto débil, ganar sin pelear.
AARON ROSS: Mensajes cortos + una sola pregunta, vender el sueño ANTES del precio.
MARIO LUNA: VSR (valor/escasez), nunca mostrar necesidad, crear deseo antes del precio.

━━━ LO QUE SIEMPRE SABÉS ━━━
- TODOS los prospectos NO tienen página web
- Tu objetivo: que el cliente llegue solo a querer la web

━━━ FLUJO ━━━
Rubro + datos → gancho inicial → perfil psicológico → siguiente mensaje → cierre.

━━━ PERFILES ━━━
DESCONFIADO: prueba social. ANALÍTICO: ROI y números. INDECISO: cierre presuntivo. CURIOSO: ir al cierre ya. ORGULLOSO: posicionarlo sobre la competencia.

━━━ OBJECIONES ━━━
"ES CARO": Etiqueta → sueño → precio ridiculo → ROI → Sócrates
"LO VOY A PENSAR": Miedo real → costo de inacción → escasez
"YA TENGO INSTAGRAM": Validar → girar (las redes son prestadas, tu web es tuya)
"NO RESPONDIÓ": Follow-up con nuevo ángulo de valor

━━━ PRODUCTOS ━━━
Landing: $150 USD · Web profesional (5 sec + formulario + WA): $350 USD · E-commerce: $700 USD · Mantenimiento: $30/mes

━━━ FORMATO DE RESPUESTA (OBLIGATORIO) ━━━
🧠 ANÁLISIS
[Perfil + estrategia + técnica usada. 2-3 líneas.]

📤 MENSAJE PARA ENVIAR
[Mensaje WhatsApp-style. Argentino. Máximo 5 líneas. Termina con pregunta o acción.]

[MEMORIA: ...] ← solo si aprendiste algo nuevo

━━━ TONO ━━━
WhatsApp natural · Argentino (vos, te, arrancamos) · Máx 1 emoji · Nunca mencionar IA`;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. HELPERS & STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function extractMemory(text) {
  const match = text.match(/\[MEMORIA:\s*([\s\S]+?)\]/i);
  return match ? match[1].trim() : null;
}

function cleanMessage(text) {
  return text.replace(/\[MEMORIA:[\s\S]+?\]/gi, "").trim();
}

// Fix 4: Robust format parsing with flexible regex + fallback
function parseValeriaResponse(content) {
  // Try primary format (emoji headers)
  const analysisMatch = content.match(/🧠\s*AN[AÁ]LISIS[\s\S]*?\n([\s\S]+?)(?=📤|$)/i);
  const messageMatch = content.match(/📤\s*MENSAJE\s*PARA\s*ENVIAR[\s\S]*?\n([\s\S]+?)(?=\[MEMORIA|$)/i);

  if (analysisMatch && messageMatch) {
    return { type: "structured", analysis: analysisMatch[1].trim(), message: messageMatch[1].trim() };
  }

  // Try fallback: look for any two-section response
  const sections = content.split(/\n{2,}/);
  if (sections.length >= 2) {
    const last = sections[sections.length - 1].trim();
    const rest = sections.slice(0, -1).join("\n\n").trim();
    if (last.length > 20 && rest.length > 20) {
      return { type: "fallback", analysis: rest, message: last };
    }
  }

  return { type: "plain", message: content };
}

function parseMemoryEntries(memoryStr) {
  if (!memoryStr) return [];
  return memoryStr.split("\n").filter(l => l.trim()).map((line, i) => ({
    id: i, text: line.replace(/^[•\-]\s*/, "").trim(), raw: line,
  }));
}

function getStage(id) { return PIPELINE_STAGES.find(s => s.id === id) || PIPELINE_STAGES[0]; }

// Fix 6: WhatsApp URL builder
function buildWAUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  if (phone) {
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

// Storage (Supabase Cloud DB)
async function loadChatList() {
  const { data, error } = await supabase.from('valeria_chats').select('*').order('ts', { ascending: false });
  if (error || !data) return [];
  return data;
}

async function saveChatList(list) {
  if (!list || list.length === 0) return;
  // Upsert the entire list to keep things synced
  const { error } = await supabase.from('valeria_chats').upsert(list, { onConflict: 'id' });
  if (error) console.error("Error validando chats:", error);
}

async function loadChatMessages(id) {
  const { data, error } = await supabase.from('valeria_messages').select('*').eq('chat_id', id).order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(m => ({ role: m.role, content: m.content, sources: m.sources }));
}

async function saveChatMessages(id, msgs) {
  if (!msgs || msgs.length === 0) return;
  // Forma simple: borramos y reinsertamos el array para mantener el estado 1 a 1 sin complicar diffs locales
  await supabase.from('valeria_messages').delete().eq('chat_id', id);
  const rows = msgs.map(m => ({ chat_id: id, role: m.role, content: m.content, sources: m.sources || [] }));
  await supabase.from('valeria_messages').insert(rows);
}

async function loadMemory() {
  const { data, error } = await supabase.from('valeria_memory').select('memory_text').order('updated_at', { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return "";
  return data[0].memory_text || "";
}

async function saveMemory(text) {
  // Como solo hay un "cerebro", pisamos todo registro viejo
  await supabase.from('valeria_memory').delete().neq('memory_text', 'x_imposible'); // hack para borrar todo
  await supabase.from('valeria_memory').insert([{ memory_text: text }]);
}

async function loadProfile() {
  const { data, error } = await supabase.from('valeria_profile').select('*').limit(1);
  if (error || !data || data.length === 0) return DEFAULT_PROFILE;
  return data[0];
}

async function saveProfile(p) {
  const { data } = await supabase.from('valeria_profile').select('id').limit(1);
  if (data && data.length > 0) {
    await supabase.from('valeria_profile').update({
      owner_name: p.ownerName,
      delivery_landing: p.deliveryLanding,
      delivery_web: p.deliveryWeb,
      delivery_ecommerce: p.deliveryEcommerce,
      payment_methods: p.paymentMethods,
      payment_terms: p.paymentTerms,
      portfolio_url: p.portfolioUrl,
      extra_notes: p.extraNotes
    }).eq('id', data[0].id);
  } else {
    await supabase.from('valeria_profile').insert([{
      owner_name: p.ownerName,
      delivery_landing: p.deliveryLanding,
      delivery_web: p.deliveryWeb,
      delivery_ecommerce: p.deliveryEcommerce,
      payment_methods: p.paymentMethods,
      payment_terms: p.paymentTerms,
      portfolio_url: p.portfolioUrl,
      extra_notes: p.extraNotes
    }]);
  }
}

async function deleteChat(id) { 
  try { await supabase.from('valeria_chats').delete().eq('id', id); } catch {} 
}

const WELCOME = { role: "assistant", content: "Bau, bienvenido.\n\nDame el rubro y lo que sepas del cliente. Te armo el mensaje exacto." };


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. GLOBAL CSS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(201,168,76,0.3),rgba(201,168,76,0.08));border-radius:4px;}
  textarea{outline:none;border:1px solid #1E1C16;background:#141418;color:#F0EAD6;transition:border-color 0.3s,box-shadow 0.3s;font-family:'Inter',sans-serif;}
  textarea:focus{border-color:rgba(201,168,76,0.3);box-shadow:0 0 0 3px rgba(201,168,76,0.06);}
  textarea::placeholder{color:#3A3028;}
  input[type=text],input[type=tel],input[type=url]{outline:none;font-family:'Inter',sans-serif;}
  @keyframes blink{0%,80%,100%{opacity:.15;transform:scale(.6)}40%{opacity:1;transform:scale(1)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideInL{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideInR{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
  @keyframes scaleIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes breathe{0%,100%{box-shadow:0 0 8px rgba(201,168,76,.15)}50%{box-shadow:0 0 18px rgba(201,168,76,.32)}}
  @keyframes pulseRing{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.9);opacity:0}}
  @keyframes fadeOverlay{from{opacity:0}to{opacity:1}}
  .v-btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all 0.2s ease;border:none;background:transparent;}
  .v-btn:active{transform:scale(0.96);}
  .v-glass{backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);}
  .v-msg-enter{animation:fadeUp 0.35s cubic-bezier(0.22,1,0.36,1);}
  .v-sidebar-item{transition:all 0.2s ease;}
  .v-sidebar-item:hover{background:#141418 !important;}
  .v-sidebar-item:hover .v-del{opacity:0.5 !important;}
  .v-sidebar-item:hover .v-del:hover{opacity:1 !important;color:#E06060 !important;}
  .v-quick{position:relative;overflow:hidden;transition:all 0.2s ease;}
  .v-quick:hover{border-color:rgba(201,168,76,0.25) !important;color:#C9A84C !important;transform:translateY(-1px);}
  .v-input-base{width:100%;resize:none;border-radius:8px;padding:8px 12px;font-size:13px;line-height:1.6;background:#141418;}
  .v-field{width:100%;padding:8px 11px;border-radius:7px;border:1px solid #1E1C16;background:#141418;color:#F0EAD6;font-size:12.5px;font-family:'Inter',sans-serif;transition:border-color 0.25s;}
  .v-field:focus{border-color:rgba(201,168,76,0.3);outline:none;}
  .v-field::placeholder{color:#3A3028;}
  .v-kanban-col{flex:1;min-width:130px;border-radius:10px;padding:10px 8px;display:flex;flex-direction:column;gap:7px;}
  .v-kanban-card{border-radius:7px;padding:9px 10px;cursor:pointer;transition:all 0.2s;}
  .v-kanban-card:hover{transform:translateY(-2px);}
  .v-pipeline-btn{font-size:9px;padding:3px 8px;border-radius:4px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:500;transition:all 0.15s;border:1px solid transparent;}
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. SUB-COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ValeriaAvatar({ size = 36, pulse = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `1.5px solid ${G.goldDim}`, animation: "pulseRing 2.2s ease-out infinite" }} />}
      <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(145deg,${G.gold}18,${G.gold}38)`, border: `1.5px solid ${G.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 4s ease-in-out infinite" }}>
        <span style={{ fontSize: size * 0.38, fontWeight: 400, color: G.gold, fontFamily: "'Cormorant Garamond',serif" }}>V</span>
      </div>
    </div>
  );
}

function StatusDot({ active }) {
  return (
    <div style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: active ? G.gold : "#3A7D5A", transition: "background 0.4s" }} />
      {active && <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: G.gold, opacity: 0.3, animation: "pulseRing 1.5s ease-out infinite" }} />}
    </div>
  );
}

function GradientDivider({ margin = "0" }) {
  return <div style={{ height: "1px", margin, background: `linear-gradient(90deg,transparent,${G.borderGold},transparent)` }} />;
}

function Overlay({ onClose }) {
  return <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 90, animation: "fadeOverlay 0.2s ease" }} />;
}

// Stage badge
function StageBadge({ stageId, small }) {
  const s = getStage(stageId);
  return (
    <span style={{ fontSize: small ? 9 : 10, padding: small ? "2px 7px" : "3px 9px", borderRadius: 20, border: `1px solid ${s.border}`, background: s.bg, color: s.text, fontWeight: 500, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
      {s.icon} {s.label}
    </span>
  );
}

// Prospect new-chat modal
function NewChatModal({ onConfirm, onCancel }) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [googleMaps, setGoogleMaps] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({ 
      prospectName: name.trim() || "Prospecto", 
      sector: sector.trim(), 
      phone: phone.trim(), 
      instagram: instagram.trim(),
      googleMaps: googleMaps.trim(),
      stage: "new" 
    });
  }

  return (
    <>
      <Overlay onClose={onCancel} />
      <div className="v-glass" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 340, zIndex: 200, borderRadius: 12, border: `1px solid ${G.borderGold}`, background: G.surfaceGlass, padding: "22px 24px", animation: "scaleIn 0.25s ease", boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${G.goldGlow2}` }}>
        <p style={{ fontSize: 11, color: G.gold, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14, fontWeight: 500 }}>Nuevo Prospecto</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Nombre del prospecto (Obligatorio)", val: name, set: setName, ph: "Ej: Juan García", type: "text" },
            { label: "WhatsApp / Celular del cliente", val: phone, set: setPhone, ph: "Ej: 5491122334455", type: "tel" },
            { label: "Instagram del negocio", val: instagram, set: setInstagram, ph: "Ej: @panaderia.juan o link completo", type: "text" },
            { label: "Google Maps / Dirección / Nombre Real", val: googleMaps, set: setGoogleMaps, ph: "Si no tiene IG, poné el nombre o link de Maps", type: "text" },
            { label: "Rubro / Sector", val: sector, set: setSector, ph: "Ej: Panadería, Peluquería, Gimnasio...", type: "text" },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize: 10, color: G.textMuted, marginBottom: 5, fontWeight: 500, letterSpacing: "0.5px" }}>{f.label}</p>
              <input type={f.type} className="v-field" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" className="v-btn" onClick={onCancel} style={{ flex: 1, padding: "9px", borderRadius: 7, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 12 }}>Cancelar</button>
            <button type="submit" className="v-btn" style={{ flex: 2, padding: "9px", borderRadius: 7, background: `linear-gradient(135deg,${G.gold}CC,${G.goldLight}BB)`, color: "#0A0A0A", fontSize: 12, fontWeight: 600 }}>Iniciar Chat →</button>
          </div>
        </form>
      </div>
    </>
  );
}

// Analysis block
function AnalysisBlock({ text }) {
  return (
    <div style={{ background: `linear-gradient(135deg,${G.surface2},${G.surface3})`, borderRadius: 8, padding: "12px 14px", border: `1px solid ${G.border}`, borderLeft: `2.5px solid ${G.goldDim}`, position: "relative", overflow: "hidden" }}>
      <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 600, color: G.textMuted, letterSpacing: "2.5px", textTransform: "uppercase" }}>🧠 Análisis</p>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: "1.7", color: G.textMuted, whiteSpace: "pre-wrap", fontWeight: 300 }}>{text}</p>
    </div>
  );
}

// Message block (Fix 6: WhatsApp button)
function MessageBlock({ text, onCopy, copied, prospectPhone, prospectName }) {
  const waUrl = buildWAUrl(prospectPhone, text);

  return (
    <div style={{ background: `linear-gradient(135deg,${G.greenBg},rgba(13,31,20,0.3))`, borderRadius: 8, padding: "14px 16px", border: `1px solid ${G.greenBorder}`, borderLeft: `3px solid ${G.green}`, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: G.greenText, letterSpacing: "2.5px", textTransform: "uppercase" }}>📤 Mensaje para enviar</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="v-btn" onClick={onCopy} style={{ fontSize: 10.5, padding: "5px 12px", borderRadius: 6, border: `1px solid ${copied ? G.green : G.greenBorder}`, background: copied ? G.green : "transparent", color: copied ? "#fff" : G.greenText, fontWeight: 500 }}>
            {copied ? "✓ Copiado" : "Copiar Texto"}
          </button>
          <a href={waUrl} target="_blank" rel="noreferrer" className="v-btn" style={{ fontSize: 10.5, padding: "5px 14px", borderRadius: 6, background: G.wa, color: "#000", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, textDecoration: "none", boxShadow: `0 0 15px rgba(37,211,102,0.3)` }}>
            <span>↗</span> WHATSAPP: {prospectName?.split(' ')[0].toUpperCase() || "CLIENTE"}
          </a>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: "1.8", color: G.text, whiteSpace: "pre-wrap", fontWeight: 300, letterSpacing: "0.3px" }}>{text}</p>
    </div>
  );
}

// Fix: Evidence block for research grounding (Fix 6+)
function EvidenceBlock({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 7, border: `1px solid ${G.border}`, background: "rgba(255,255,255,0.02)" }}>
      <p style={{ margin: "0 0 6px", fontSize: 8.5, fontWeight: 600, color: G.textDim, letterSpacing: "1.5px", textTransform: "uppercase" }}>🔗 Fuentes de investigación</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sources.map((s, i) => (
          <a key={i} href={s.uri} target="_blank" rel="noreferrer" 
            style={{ fontSize: 10, color: G.blueText, textDecoration: "none", padding: "3px 8px", borderRadius: 4, background: G.blueBg, border: `1px solid ${G.blueBorder}`, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.title || "Ver fuente"} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Knowledge Dashboard ──
function KnowledgeDashboard({ memory, onClose, onUpdateMemory, chatCount }) {
  const entries = useMemo(() => parseMemoryEntries(memory), [memory]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  async function deleteEntry(id) {
    const updated = entries.filter(e => e.id !== id).map(e => e.raw).join("\n");
    await onUpdateMemory(updated);
  }
  async function saveEdit(id) {
    const updated = entries.map(e => e.id === id ? `• ${editText.trim()}` : e.raw).join("\n");
    await onUpdateMemory(updated);
    setEditingId(null);
  }

  return (
    <>
      <Overlay onClose={onClose} />
      <div className="v-glass" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 340, maxWidth: "85%", background: G.surfaceGlass, borderLeft: `1px solid ${G.borderGold}`, zIndex: 100, display: "flex", flexDirection: "column", animation: "slideInR 0.3s cubic-bezier(0.22,1,0.36,1)", boxShadow: `-20px 0 60px rgba(0,0,0,0.4)` }}>
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: G.gold, letterSpacing: "2px", textTransform: "uppercase" }}>🧠 Centro de Conocimiento</p>
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: G.textMuted, fontWeight: 300 }}>Lo que Valeria aprendió trabajando con vos</p>
          </div>
          <button className="v-btn" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <GradientDivider />
        <div style={{ padding: "12px 18px", display: "flex", gap: 10 }}>
          {[{ label: "Registros", value: entries.length, color: G.gold }, { label: "Conversaciones", value: chatCount, color: G.blueText }].map(s => (
            <div key={s.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: `linear-gradient(135deg,${G.surface2},${G.surface3})`, border: `1px solid ${G.border}`, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 300, color: s.color, fontFamily: "'Cormorant Garamond',serif" }}>{s.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 9, color: G.textMuted, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <GradientDivider />
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>🧠</p>
              <p style={{ color: G.textDim, fontSize: 12, lineHeight: 1.6, fontWeight: 300 }}>Aún sin registros. Se crean al chatear.</p>
            </div>
          ) : entries.map((entry, i) => (
            <div key={entry.id} style={{ padding: "10px 12px", borderRadius: 7, background: G.surface2, border: `1px solid ${G.border}`, animation: `fadeUp 0.3s ease ${i * 0.04}s both`, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = G.borderGold}
              onMouseLeave={e => e.currentTarget.style.borderColor = G.border}>
              {editingId === entry.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ width: "100%", resize: "none", borderRadius: 5, padding: "7px 10px", fontSize: 12, lineHeight: "1.6", background: G.surface3, border: `1px solid ${G.borderGold}` }} />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="v-btn" onClick={() => setEditingId(null)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 4, border: `1px solid ${G.border}`, color: G.textMuted }}>Cancelar</button>
                    <button className="v-btn" onClick={() => saveEdit(entry.id)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 4, background: `${G.gold}22`, border: `1px solid ${G.borderGold}`, color: G.gold }}>Guardar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 3, minHeight: 16, borderRadius: 2, background: `linear-gradient(180deg,${G.gold}55,${G.gold}15)`, flexShrink: 0, marginTop: 2 }} />
                  <p style={{ margin: 0, flex: 1, fontSize: 12, lineHeight: "1.65", color: G.textSoft, fontWeight: 300 }}>{entry.text}</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      { icon: "✎", action: () => { setEditingId(entry.id); setEditText(entry.text); }, hoverColor: G.gold, hoverBorder: G.borderGold },
                      { icon: "✕", action: () => deleteEntry(entry.id), hoverColor: G.dangerText, hoverBorder: `${G.danger}55` },
                    ].map(btn => (
                      <button key={btn.icon} className="v-btn" onClick={btn.action}
                        style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: `1px solid ${G.border}`, color: G.textDim }}
                        onMouseEnter={e => { e.currentTarget.style.color = btn.hoverColor; e.currentTarget.style.borderColor = btn.hoverBorder; }}
                        onMouseLeave={e => { e.currentTarget.style.color = G.textDim; e.currentTarget.style.borderColor = G.border; }}>
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {memory && (
          <>
            <GradientDivider />
            <div style={{ padding: "12px 14px" }}>
              <button className="v-btn" onClick={async () => { if (window.confirm("¿Borrar toda la memoria?")) await onUpdateMemory(""); }}
                style={{ width: "100%", fontSize: 10.5, padding: 8, borderRadius: 6, border: `1px solid ${G.border}`, color: G.textDim }}
                onMouseEnter={e => { e.currentTarget.style.color = G.dangerText; e.currentTarget.style.borderColor = `${G.danger}66`; e.currentTarget.style.background = `${G.danger}11`; }}
                onMouseLeave={e => { e.currentTarget.style.color = G.textDim; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.background = "transparent"; }}>
                Borrar toda la memoria
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Business Profile Panel (Fix 1) ──
function BusinessProfilePanel({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ ...profile });
  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  const fields = [
    { key: "ownerName", label: "Tu nombre", ph: "Bau", type: "text" },
    { key: "deliveryLanding", label: "Entrega Landing", ph: "5-7 días", type: "text" },
    { key: "deliveryWeb", label: "Entrega Web Profesional", ph: "10-15 días", type: "text" },
    { key: "deliveryEcommerce", label: "Entrega E-commerce", ph: "20-30 días", type: "text" },
    { key: "paymentMethods", label: "Métodos de pago", ph: "Transferencia / MercadoPago", type: "text" },
    { key: "paymentTerms", label: "Condiciones de pago", ph: "50% adelanto, 50% al entregar", type: "text" },
    { key: "portfolioUrl", label: "URL Portfolio (opcional)", ph: "https://tu-portfolio.com", type: "url" },
  ];

  return (
    <>
      <Overlay onClose={onClose} />
      <div className="v-glass" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 340, maxWidth: "85%", background: G.surfaceGlass, borderRight: `1px solid ${G.borderGold}`, zIndex: 100, display: "flex", flexDirection: "column", animation: "slideInL 0.3s cubic-bezier(0.22,1,0.36,1)", boxShadow: `20px 0 60px rgba(0,0,0,0.4)` }}>
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: G.gold, letterSpacing: "2px", textTransform: "uppercase" }}>🏢 Mi Negocio</p>
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: G.textMuted, fontWeight: 300 }}>Valeria usa estos datos para responder mejor</p>
          </div>
          <button className="v-btn" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <GradientDivider />
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {fields.map(f => (
            <div key={f.key}>
              <p style={{ margin: "0 0 5px", fontSize: 10, color: G.textMuted, fontWeight: 500, letterSpacing: "0.5px" }}>{f.label}</p>
              <input type={f.type} className="v-field" value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder={f.ph} />
            </div>
          ))}
          <div>
            <p style={{ margin: "0 0 5px", fontSize: 10, color: G.textMuted, fontWeight: 500, letterSpacing: "0.5px" }}>Notas extra para Valeria</p>
            <textarea className="v-field v-input-base" rows={3} value={form.extraNotes || ""} onChange={e => set("extraNotes", e.target.value)} placeholder="Algo que Valeria debería saber sobre cómo trabajás..." style={{ resize: "vertical", maxHeight: 120 }} />
          </div>
        </div>
        <GradientDivider />
        <div style={{ padding: "12px 18px", display: "flex", gap: 8 }}>
          <button className="v-btn" onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 7, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 12 }}>Cancelar</button>
          <button className="v-btn" onClick={async () => { await onSave(form); onClose(); }} style={{ flex: 2, padding: 9, borderRadius: 7, background: `linear-gradient(135deg,${G.gold}CC,${G.goldLight}BB)`, color: "#0A0A0A", fontSize: 12, fontWeight: 600 }}>Guardar ✓</button>
        </div>
      </div>
    </>
  );
}

// ── CRM Pipeline Panel (Fix 3+5) ──
function CRMPipeline({ chatList, onClose, onOpenChat, onChangeStage }) {
  const byStage = useMemo(() => {
    const map = {};
    PIPELINE_STAGES.forEach(s => { map[s.id] = []; });
    chatList.forEach(c => { const sid = c.stage || "new"; if (map[sid]) map[sid].push(c); });
    return map;
  }, [chatList]);

  return (
    <>
      <Overlay onClose={onClose} />
      <div className="v-glass" style={{ position: "absolute", inset: 0, zIndex: 100, background: G.surfaceGlass, display: "flex", flexDirection: "column", animation: "fadeUp 0.25s ease" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${G.border}` }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: G.gold, letterSpacing: "2px", textTransform: "uppercase" }}>📊 Pipeline de Ventas</p>
            <p style={{ margin: "3px 0 0", fontSize: 10.5, color: G.textMuted, fontWeight: 300 }}>{chatList.length} prospecto{chatList.length !== 1 ? "s" : ""} en seguimiento</p>
          </div>
          <button className="v-btn" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.borderColor = G.borderGold; }}
            onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; e.currentTarget.style.borderColor = G.border; }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "16px 14px", display: "flex", gap: 10 }}>
          {PIPELINE_STAGES.map(stage => (
            <div key={stage.id} className="v-kanban-col" style={{ background: stage.bg, border: `1px solid ${stage.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingBottom: 8, borderBottom: `1px solid ${stage.border}` }}>
                <span style={{ fontSize: 13 }}>{stage.icon}</span>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: stage.text, letterSpacing: "0.5px" }}>{stage.label}</p>
                <span style={{ marginLeft: "auto", fontSize: 10, color: stage.text, opacity: 0.7, background: `${stage.border}`, borderRadius: 10, padding: "1px 6px" }}>{byStage[stage.id]?.length || 0}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {(byStage[stage.id] || []).map(chat => (
                  <div key={chat.id} className="v-kanban-card" style={{ background: `rgba(14,14,18,0.8)`, border: `1px solid ${stage.border}` }}
                    onClick={() => { onOpenChat(chat.id); onClose(); }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11.5, color: G.text, fontWeight: 400, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {chat.prospectName || chat.title}
                    </p>
                    {chat.sector && <p style={{ margin: "0 0 6px", fontSize: 10, color: G.textMuted, fontWeight: 300 }}>{chat.sector}</p>}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {PIPELINE_STAGES.filter(s => s.id !== stage.id).slice(0, 3).map(s => (
                        <button key={s.id} className="v-btn v-pipeline-btn" onClick={e => { e.stopPropagation(); onChangeStage(chat.id, s.id); }}
                          style={{ color: s.text, borderColor: s.border, background: s.bg, fontSize: 8 }}>
                          → {s.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: "5px 0 0", fontSize: 9, color: G.textDim }}>{formatDate(chat.ts)}</p>
                  </div>
                ))}
                {(byStage[stage.id] || []).length === 0 && (
                  <p style={{ fontSize: 10, color: G.textDim, textAlign: "center", padding: "16px 0", fontWeight: 300 }}>Sin prospectos</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function App() {
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [memory, setMemory] = useState("");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const [chatMenu, setChatMenu] = useState(null); // id of chat whose ⋮ menu is open
  const [renamingChat, setRenamingChat] = useState(null); // id of chat being renamed
  const [renameText, setRenameText] = useState("");
  const [ready, setReady] = useState(false);

  // Panel states
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const bottomRef = useRef(null);

  const activeChat = useMemo(() => chatList.find(c => c.id === activeChatId), [chatList, activeChatId]);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = useMemo(() => {
    const steps = ["Conectando con Google Search..."];
    if (activeChat?.instagram) steps.push(`Investigando Instagram: ${activeChat.instagram}...`);
    if (activeChat?.googleMaps) steps.push(`Analizando Google Maps para ${activeChat.prospectName}...`);
    steps.push("Valeria está redactando la estrategia final...");
    return steps;
  }, [activeChat]);

  // Effect to cycle through loading steps
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % loadingSteps.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading, loadingSteps]);
  const memoryCount = useMemo(() => memory ? memory.split("\n").filter(l => l.trim()).length : 0, [memory]);
  const quickReplies = useMemo(() => ["Objeción de precio", "Lo va a pensar", "Ya tiene Instagram", "No respondió", "Cerrar ahora"], []);

  // Load on mount
  useEffect(() => {
    (async () => {
      const [list, mem, prof] = await Promise.all([loadChatList(), loadMemory(), loadProfile()]);
      
      // Mapeo inverso de snake_case a camelCase para el profile de Supabase
      const mappedProfile = prof.owner_name ? {
        ownerName: prof.owner_name,
        deliveryLanding: prof.delivery_landing,
        deliveryWeb: prof.delivery_web,
        deliveryEcommerce: prof.delivery_ecommerce,
        paymentMethods: prof.payment_methods,
        paymentTerms: prof.payment_terms,
        portfolioUrl: prof.portfolio_url,
        extraNotes: prof.extra_notes,
      } : prof;

      setChatList(list || []);
      setMemory(mem || "");
      setProfile(mappedProfile);
      setReady(true);
    })();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── Chat operations ──
  const newChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([WELCOME]);
    setInput("");
    setShowNewChat(true);
  }, []);

  const startChatWithProspect = useCallback(async (prospectData) => {
    setShowNewChat(false);
    const currentId = genId();
    const title = prospectData.prospectName + (prospectData.sector ? ` · ${prospectData.sector}` : "");
    const newEntry = { id: currentId, title, ts: Date.now(), preview: title, ...prospectData };
    const updated = [newEntry, ...chatList];
    setChatList(updated);
    setActiveChatId(currentId);
    setInput("");
    
    // Silently auto-send first message: Valeria investigates on her own
    const autoMsg = (prospectData.instagram || prospectData.googleMaps)
      ? "Investigá a este prospecto y armame un primer mensaje para contactarlo por WhatsApp."
      : "Armame un primer mensaje de contacto para este prospecto.";
    const initialMsgs = [WELCOME, { role: "user", content: autoMsg }];
    setMessages(initialMsgs);
    setLoading(true);
    await saveChatList(updated);

    try {
      const contents = initialMsgs.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: buildSystemPrompt(memory, profile, prospectData) }] },
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.75 },
          instagramUrl: prospectData.instagram,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sin respuesta");
      const raw = data.data.text;

      const grounding = data.data.groundingMetadata;
      const sources = grounding?.groundingChunks?.map(chunk => ({
        title: chunk.web?.title, uri: chunk.web?.uri
      })).filter(s => s.uri) || [];

      const newMem = extractMemory(raw);
      if (newMem) {
        const updatedMem = memory ? `${memory}\n• ${newMem}` : `• ${newMem}`;
        setMemory(updatedMem);
        await saveMemory(updatedMem);
      }

      const clean = cleanMessage(raw);
      const finalMsgs = [...initialMsgs, { role: "assistant", content: clean, sources }];
      setMessages(finalMsgs);
      await saveChatMessages(currentId, finalMsgs);
    } catch (e) {
      console.error("Auto-research error:", e);
      const errMsgs = [...initialMsgs, { role: "assistant", content: `Error al investigar: ${e.message}. Probá de nuevo en unos segundos.` }];
      setMessages(errMsgs);
      await saveChatMessages(currentId, errMsgs);
    } finally {
      setLoading(false);
    }
  }, [chatList, memory, profile]);

  const openChat = useCallback(async (id) => {
    const msgs = await loadChatMessages(id);
    setActiveChatId(id);
    setMessages(msgs.length ? msgs : [WELCOME]);
    setInput("");
  }, []);

  // Soft-delete: removes chat from list but keeps memory intact
  const handleDelete = useCallback(async (id) => {
    // Only remove from chat list — do NOT call deleteChat(id) to preserve localStorage messages
    // Memory (valeria_memory) is a separate key and is never touched here
    const updated = chatList.filter(c => c.id !== id);
    setChatList(updated);
    await saveChatList(updated);
    if (activeChatId === id) { setActiveChatId(null); setMessages([WELCOME]); }
    setConfirmDel(null);
    setChatMenu(null);
  }, [chatList, activeChatId]);

  // Rename chat
  const handleRename = useCallback(async (id, newName) => {
    if (!newName.trim()) return;
    const updated = chatList.map(c => c.id === id ? { ...c, prospectName: newName.trim(), title: newName.trim() } : c);
    setChatList(updated);
    await saveChatList(updated);
    setRenamingChat(null);
    setRenameText("");
    setChatMenu(null);
  }, [chatList]);

  const handleChangeStage = useCallback(async (chatId, newStage) => {
    const updated = chatList.map(c => c.id === chatId ? { ...c, stage: newStage } : c);
    setChatList(updated);
    await saveChatList(updated);
  }, [chatList]);

  const handleUpdateMemory = useCallback(async (newMemory) => {
    setMemory(newMemory);
    await saveMemory(newMemory);
  }, []);

  const handleSaveProfile = useCallback(async (newProfile) => {
    setProfile(newProfile);
    await saveProfile(newProfile);
  }, []);

  // ── Send message (Gemini API — Fix 2: key from env) ──
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    let currentId = activeChatId;
    let currentList = chatList;

    if (!currentId) {
      currentId = genId();
      const newEntry = { id: currentId, title: text.slice(0, 40), ts: Date.now(), preview: text.slice(0, 60), stage: "new" };
      currentList = [newEntry, ...chatList];
      setChatList(currentList);
      setActiveChatId(currentId);
      await saveChatList(currentList);
    }

    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const contents = updated.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: buildSystemPrompt(memory, profile, activeChat) }] },
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.75 },
          instagramUrl: activeChat?.instagram,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sin respuesta");
      const raw = data.data.text;

      // Extract research sources from groundingMetadata
      const grounding = data.data.groundingMetadata;
      const sources = grounding?.groundingChunks?.map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri
      })).filter(s => s.uri) || [];

      const newMem = extractMemory(raw);
      if (newMem) {
        const updatedMem = memory ? `${memory}\n• ${newMem}` : `• ${newMem}`;
        setMemory(updatedMem);
        await saveMemory(updatedMem);
      }

      const clean = cleanMessage(raw);
      const finalMsgs = [...updated, { role: "assistant", content: clean, sources }];
      setMessages(finalMsgs);

      const updatedList = currentList.map(c => c.id === currentId ? { ...c, preview: text.slice(0, 60), ts: Date.now(), stage: c.stage || "new" } : c);
      setChatList(updatedList);
      await saveChatList(updatedList);
      await saveChatMessages(currentId, finalMsgs);
    } catch (e) {
      console.error("Gemini error:", e);
      const errMsg = [...updated, { role: "assistant", content: `Error al conectar con Google: ${e.message}. Revisá tu API Key en el archivo .env.` }];
      setMessages(errMsg);
      if (currentId) await saveChatMessages(currentId, errMsg);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId, chatList, messages, memory, profile]);

  const handleKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const copyMsg = useCallback((content, idx) => {
    const parsed = parseValeriaResponse(content);
    navigator.clipboard.writeText(parsed.message || content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Render Valeria response (Fix 4: robust parsing)
  const renderValeria = useCallback((content, idx, sources) => {
    const parsed = parseValeriaResponse(content);

    if (parsed.type === "plain") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "1.8", color: G.text, whiteSpace: "pre-wrap", fontWeight: 300 }}>{parsed.message}</p>
          <EvidenceBlock sources={sources} />
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {parsed.analysis && <AnalysisBlock text={parsed.analysis} />}
        <MessageBlock text={parsed.message} onCopy={() => copyMsg(content, idx)} copied={copied === idx} prospectPhone={activeChat?.phone} prospectName={activeChat?.prospectName} />
        <EvidenceBlock sources={sources} />
      </div>
    );
  }, [copied, copyMsg, activeChat]);

  // Loading screen
  if (!ready) return (
    <div style={{ height: "100%", minHeight: 680, background: G.bgGradient, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{css}</style>
      <ValeriaAvatar size={44} pulse />
      <p style={{ color: G.textMuted, fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase" }}>Iniciando...</p>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100%", minHeight: 680, background: G.bgGradient, borderRadius: 14, overflow: "hidden", border: `1px solid ${G.border}`, position: "relative", fontFamily: "'Inter',sans-serif" }}>
      <style>{css}</style>

      {/* ═══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <div className="v-glass" style={{ width: 240, flexShrink: 0, background: G.surfaceGlass, borderRight: `1px solid ${G.border}`, display: "flex", flexDirection: "column", animation: "slideInL 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
          {/* Sidebar Header */}
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ValeriaAvatar size={26} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: G.gold, letterSpacing: "0.5px" }}>VALERIA</p>
                <p style={{ margin: 0, fontSize: 8, color: G.textMuted, letterSpacing: "1.5px", fontWeight: 500 }}>SECRETARIA DE VENTAS</p>
              </div>
            </div>
          </div>

          <div style={{ padding: "12px 10px" }}>
            <button className="v-btn" onClick={() => setShowNewChat(true)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: `linear-gradient(135deg,${G.surface2},${G.surface3})`, border: `1px solid ${G.border}`, color: G.text, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>+</span> Nuevo Chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            <p style={{ margin: "12px 8px 8px", fontSize: 9, color: G.textDim, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 700 }}>Conversaciones</p>
            {chatList.length === 0 && <p style={{ margin: "16px 10px", fontSize: 11, color: G.textDim, fontWeight: 300 }}>No hay chats</p>}
            {chatList.map(chat => (
              <div key={chat.id} className="v-sidebar-item"
                style={{ borderRadius: 10, marginBottom: 4, padding: "10px 14px", cursor: "pointer", background: activeChatId === chat.id ? G.surface3 : "transparent", position: "relative", transition: "background 0.2s" }}
                onClick={() => openChat(chat.id)}
                onMouseEnter={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = G.surface2; }}
                onMouseLeave={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {renamingChat === chat.id ? (
                    <form onSubmit={e => { e.preventDefault(); e.stopPropagation(); handleRename(chat.id, renameText); }} onClick={e => e.stopPropagation()} style={{ flex: 1, display: "flex" }}>
                      <input type="text" className="v-field" value={renameText} onChange={e => setRenameText(e.target.value)} autoFocus
                        style={{ flex: 1, fontSize: 13, padding: "2px 6px", background: G.surface, color: G.text, border: `1px solid ${G.border}`, borderRadius: 4 }} />
                    </form>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13.5, color: activeChatId === chat.id ? G.text : G.textMuted, fontWeight: activeChatId === chat.id ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {chat.prospectName || chat.title}
                    </p>
                  )}
                  {/* ChatGPT style '...' menu */}
                  <button className="v-btn v-sidebar-menu-btn" onClick={e => { e.stopPropagation(); setChatMenu(chatMenu === chat.id ? null : chat.id); }}
                    style={{ fontSize: 16, padding: "0 4px", color: G.textMuted, opacity: activeChatId === chat.id || chatMenu === chat.id ? 1 : 0, fontWeight: 700 }}>
                    ...
                  </button>
                </div>

                {chatMenu === chat.id && (
                  <div className="v-glass" onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 8, top: 38, zIndex: 100, background: G.surface2, border: `1px solid ${G.borderGold}`, borderRadius: 8, padding: "6px 0", minWidth: 140, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", animation: "scaleIn 0.15s ease" }}>
                    <button className="v-btn" onClick={() => { setRenamingChat(chat.id); setRenameText(chat.prospectName || chat.title || ""); setChatMenu(null); }}
                      style={{ width: "100%", textAlign: "left", padding: "8px 16px", fontSize: 12, color: G.textSoft }}
                      onMouseEnter={e => e.currentTarget.style.background = G.surface3}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>✎ Renombrar</button>
                    {confirmDel === chat.id ? (
                      <div style={{ padding: "8px 16px", display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${G.border}` }}>
                        <span style={{ fontSize: 11, color: G.dangerText, fontWeight: 500 }}>¿Borrar?</span>
                        <button className="v-btn" onClick={() => handleDelete(chat.id)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${G.danger}`, color: G.dangerText }}>Sí</button>
                        <button className="v-btn" onClick={() => setConfirmDel(null)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${G.border}`, color: G.textMuted }}>No</button>
                      </div>
                    ) : (
                      <button className="v-btn" onClick={() => setConfirmDel(chat.id)}
                        style={{ width: "100%", textAlign: "left", padding: "8px 16px", fontSize: 12, color: G.dangerText }}
                        onMouseEnter={e => e.currentTarget.style.background = G.surface3}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>✕ Eliminar</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${G.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="v-btn" onClick={() => setShowPipeline(true)}
              style={{ textAlign: "left", fontSize: 12, color: G.textMuted, fontWeight: 400, padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = G.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              📊 Pipeline CRM <span style={{ marginLeft: "auto", fontSize: 10, background: G.goldDim, padding: "1px 6px", borderRadius: 8, color: "#000" }}>{chatList.length}</span>
            </button>
            <button className="v-btn" onClick={() => setShowProfile(true)}
              style={{ textAlign: "left", fontSize: 12, color: G.textMuted, fontWeight: 400, padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = G.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              🏢 Mi Negocio
            </button>
            <button className="v-btn" onClick={() => setShowDashboard(true)}
              style={{ textAlign: "left", fontSize: 12, color: G.textMuted, fontWeight: 400, padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = G.surface2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              🧠 Memoria ({memoryCount})
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN CHAT ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div className="v-glass" style={{ padding: "12px 18px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 12, background: G.surfaceGlass, flexShrink: 0 }}>
          <button className="v-btn" onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${G.border}`, color: sidebarOpen ? G.gold : G.textMuted, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>

          <ValeriaAvatar size={34} pulse={loading} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 400, fontSize: 14, color: G.text, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.8px" }}>
                {activeChat?.prospectName ? activeChat.prospectName : "Valeria"}
              </p>
              {activeChat?.stage && <StageBadge stageId={activeChat.stage} small />}
            </div>
            <p style={{ margin: "1px 0 0", fontSize: 10, color: loading ? G.gold : G.textMuted, fontWeight: 300, letterSpacing: "1.2px", textTransform: "uppercase", transition: "color 0.3s" }}>
              {loading ? "Analizando..." : activeChat?.sector ? activeChat.sector : memoryCount > 0 ? `${memoryCount} registros en memoria` : "7 metodologías · Élite"}
            </p>
          </div>

          {/* Stage quick change (when chat is active) */}
          {activeChat && (
            <div style={{ display: "flex", gap: 4 }}>
              <select value={activeChat.stage || "new"} onChange={e => handleChangeStage(activeChat.id, e.target.value)}
                style={{ fontSize: 10, padding: "4px 8px", borderRadius: 5, border: `1px solid ${G.borderGold}`, background: G.surface2, color: G.gold, fontFamily: "'Inter',sans-serif", cursor: "pointer" }}>
                {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
              </select>
              {activeChat.phone && (
                <a href={`https://wa.me/${activeChat.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title={`WhatsApp: ${activeChat.phone}`}
                  style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${G.waBorder}`, background: G.waBg, color: G.wa, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, textDecoration: "none" }}>
                  ↗
                </a>
              )}
            </div>
          )}

          {/* Header actions */}
          {[
            { icon: "📊", title: "Pipeline CRM", action: () => setShowPipeline(true) },
            { icon: "🏢", title: "Mi Negocio", action: () => setShowProfile(true) },
            { icon: "🧠", title: "Centro de Conocimiento", action: () => setShowDashboard(true) },
          ].map(btn => (
            <button key={btn.icon} className="v-btn" onClick={btn.action} title={btn.title}
              style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${G.border}`, color: G.textMuted, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = G.borderGold; e.currentTarget.style.color = G.gold; e.currentTarget.style.background = G.goldGlow2; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textMuted; e.currentTarget.style.background = "transparent"; }}>
              {btn.icon}
            </button>
          ))}

          <StatusDot active={loading} />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} className="v-msg-enter" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "user" ? (
                <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: "12px 12px 3px 12px", background: `linear-gradient(135deg,${G.blueBg},rgba(10,24,40,0.3))`, border: `1px solid ${G.blueBorder}`, borderRight: `2.5px solid ${G.blue}`, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
                  <span style={{ display: "block", fontSize: 9, color: G.blueText, marginBottom: 4, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>{activeChat?.prospectName ? "Bau" : "Bau"}</span>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: "1.7", color: G.text, whiteSpace: "pre-wrap", fontWeight: 300 }}>{msg.content}</p>
                </div>
              ) : (
                <div style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: `linear-gradient(160deg,${G.surface},${G.surface2})`, border: `1px solid ${G.border}`, boxShadow: `0 4px 20px rgba(0,0,0,0.15)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ValeriaAvatar size={14} />
                    <span style={{ fontSize: 9, color: G.gold, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase" }}>Valeria</span>
                  </div>
                  {renderValeria(msg.content, i, msg.sources)}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: `linear-gradient(160deg,${G.surface},${G.surface2})`, border: `1px solid ${G.border}`, animation: "fadeUp 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <ValeriaAvatar size={14} pulse />
                <span style={{ fontSize: 9, color: G.gold, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase" }}>Valeria Investigando...</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: `linear-gradient(135deg,${G.gold},${G.goldLight})`, animation: "blink 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
                  <span style={{ fontSize: 11, color: G.textSoft, marginLeft: 6, fontWeight: 400, letterSpacing: "0.3px" }}>
                    {loadingSteps[loadingStep]}
                  </span>
                </div>
                {/* Progress bar visual */}
                <div style={{ width: "100%", height: 3, background: G.surface3, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg,${G.goldDim},${G.gold})`, transition: "width 0.8s ease" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${G.border}`, background: G.surfaceGlass, flexShrink: 0 }}>
          <div style={{ marginBottom: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {quickReplies.map(s => (
              <button key={s} className="v-btn v-quick" onClick={() => setInput(s)}
                style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, border: `1px solid ${G.border}`, color: G.textMuted }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea className="v-input-base" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Rubro del cliente o respuesta que recibiste..." rows={2}
              style={{ flex: 1, maxHeight: 100, overflowY: "auto" }} />
            <button className="v-btn" onClick={send} disabled={loading || !input.trim()}
              style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.25 : 1, background: `linear-gradient(135deg,${G.gold}CC,${G.goldLight}BB)`, color: "#0A0A0A", letterSpacing: "0.5px", alignSelf: "flex-end", flexShrink: 0, boxShadow: loading || !input.trim() ? "none" : `0 2px 12px ${G.goldGlow}`, transition: "opacity 0.2s,box-shadow 0.3s,transform 0.15s" }}
              onMouseEnter={e => { if (!loading && input.trim()) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 20px ${G.goldGlow}`; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* ═══ OVERLAY PANELS ═══════════════════════════════════════════════════ */}
      {showNewChat && <NewChatModal onConfirm={startChatWithProspect} onCancel={() => setShowNewChat(false)} />}
      {showDashboard && <KnowledgeDashboard memory={memory} onClose={() => setShowDashboard(false)} onUpdateMemory={handleUpdateMemory} chatCount={chatList.length} />}
      {showProfile && <BusinessProfilePanel profile={profile} onClose={() => setShowProfile(false)} onSave={handleSaveProfile} />}
      {showPipeline && <CRMPipeline chatList={chatList} onClose={() => setShowPipeline(false)} onOpenChat={openChat} onChangeStage={handleChangeStage} />}
    </div>
  );
}
