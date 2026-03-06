import { useState, useRef } from "react";

// ── helpers ──────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const MOODS = [
  { score: 1, emoji: "😢", label: "失敗" },
  { score: 2, emoji: "😕", label: "普通" },
  { score: 3, emoji: "🙂", label: "不錯" },
  { score: 4, emoji: "😄", label: "很好" },
  { score: 5, emoji: "🤤", label: "完美" },
];

const COVER_COLORS = ["#7A6050","#A03020","#3A6B45","#2B5278","#7B4A8A","#8A6A20","#4A6670","#A05030"];
const CATEGORY_OPTS = ["麵包","料理","甜點","湯品","其他"];
const CAT_STYLE = {
  麵包:{ bg:"#F5EFE6", text:"#7A6050" },
  料理:{ bg:"#F7EDEA", text:"#A03020" },
  甜點:{ bg:"#EEF4EF", text:"#3A6B45" },
  湯品:{ bg:"#EAF0F7", text:"#2B5278" },
  其他:{ bg:"#F3EEF5", text:"#7B4A8A" },
};

const blankRecipe = () => ({
  id: Date.now(),
  title: "",
  category: "麵包",
  emoji: "🍞",
  coverColor: COVER_COLORS[0],
  tags: [],
  ingredients: [{ name: "", amount: "" }],
  steps: [""],
  shopping: [""],
  sessions: [],
});

const EMOJI_OPTS = ["🍞","🥐","🥖","🥨","🧁","🎂","🍰","🥧","🍅","🍗","🥩","🍜","🍲","🥘","🍛","🍵","🥗","🥚","🧆","🫕"];

const initialRecipes = [
  {
    id: 1, title: "鄉村酸種麵包", category: "麵包", emoji: "🍞", coverColor: "#7A6050",
    tags: ["酸種","全麥","長時發酵"],
    ingredients: [
      { name: "高筋麵粉", amount: "400g" }, { name: "全麥麵粉", amount: "100g" },
      { name: "水", amount: "390g" }, { name: "酸種 starter", amount: "100g" }, { name: "鹽", amount: "10g" },
    ],
    steps: ["混合麵粉與水，自我分解 30 分鐘","加入 starter，拌勻後加鹽","每 30 分鐘折疊一次，共 4 次","室溫發酵 4 小時後冷藏隔夜","取出整形，放入發酵籃","烤箱預熱 250°C，連鑄鐵鍋一起","蓋蓋烤 20 分鐘，開蓋再烤 25 分鐘"],
    shopping: ["高筋麵粉","全麥麵粉"],
    sessions: [
      { id: 101, date: "2025-03-01", rating: 4, roomTemp: 24, doughTemp: 26, fermentHours: 4.5, note: "水量提高到 78%，氣孔比上次更漂亮！但烤色還可以再深一點。", photos: [] },
      { id: 102, date: "2025-02-14", rating: 2, roomTemp: 20, doughTemp: 22, fermentHours: 5, note: "室溫偏低，發酵不足，麵包偏緊實。", photos: [] },
    ],
  },
  {
    id: 2, title: "番茄燉雞腿", category: "料理", emoji: "🍅", coverColor: "#A03020",
    tags: ["燉煮","番茄","家常"],
    ingredients: [
      { name: "雞腿", amount: "4 支" }, { name: "番茄罐頭", amount: "400g" },
      { name: "洋蔥", amount: "1 顆" }, { name: "蒜頭", amount: "5 瓣" }, { name: "魚露", amount: "1 大匙" },
    ],
    steps: ["雞腿兩面煎至金黃","炒香洋蔥與蒜頭","加入番茄罐頭與魚露","小火燉 40 分鐘","收汁至濃稠"],
    shopping: ["雞腿","番茄罐頭"],
    sessions: [
      { id: 201, date: "2025-02-24", rating: 5, roomTemp: null, doughTemp: null, fermentHours: null, note: "加魚露提鮮，效果超好！下次試試加橄欖。", photos: [] },
    ],
  },
];

// ── reusable sheet ────────────────────────────────────────
function Sheet({ onClose, title, children, accentColor }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(16,10,4,0.55)",zIndex:200,display:"flex",alignItems:"flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-up" style={{ background:"#FAF7F1",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:420,margin:"0 auto",maxHeight:"92vh",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 22px 16px",borderBottom:"1px solid #EDE8DF",flexShrink:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#241A10" }}>{title}</span>
          <button onClick={onClose} style={{ background:"#EDE8DF",border:"none",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:15,color:"#9B8878",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>
        <div style={{ overflowY:"auto",flex:1,padding:"20px 22px 40px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── swipeable card ────────────────────────────────────────
function SwipeCard({ onDelete, onDuplicate, children }) {
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(null); // 'left'|'right'|null

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(Math.max(-90, Math.min(90, dx)));
  };
  const onTouchEnd = () => {
    if (offset < -50) { setRevealed("left"); setOffset(-80); }
    else if (offset > 50) { setRevealed("right"); setOffset(80); }
    else { setRevealed(null); setOffset(0); }
    startX.current = null;
  };
  const reset = () => { setOffset(0); setRevealed(null); };

  return (
    <div style={{ position:"relative",overflow:"hidden",borderRadius:18,marginBottom:14 }}>
      {/* action backgrounds */}
      <div style={{ position:"absolute",inset:0,display:"flex",justifyContent:"space-between",borderRadius:18 }}>
        <div style={{ width:80,background:"#3A6B45",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4,borderRadius:"18px 0 0 18px" }}
          onClick={() => { onDuplicate(); reset(); }}>
          <span style={{ fontSize:20 }}>📋</span>
          <span style={{ fontSize:10,color:"#fff",fontWeight:600 }}>複製</span>
        </div>
        <div style={{ width:80,background:"#A03020",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4,borderRadius:"0 18px 18px 0" }}
          onClick={() => { onDelete(); reset(); }}>
          <span style={{ fontSize:20 }}>🗑</span>
          <span style={{ fontSize:10,color:"#fff",fontWeight:600 }}>刪除</span>
        </div>
      </div>
      {/* card */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ transform:`translateX(${offset}px)`,transition: startX.current ? "none" : "transform 0.3s cubic-bezier(.2,.8,.3,1)",position:"relative",zIndex:1 }}
      >{children}</div>
    </div>
  );
}

// ── editable list ─────────────────────────────────────────
function EditableList({ items, onChange, placeholder, twoCol }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex",gap:8,alignItems:"center" }}>
          {twoCol ? (
            <>
              <input value={item.name} onChange={(e) => { const n=[...items]; n[i]={...n[i],name:e.target.value}; onChange(n); }}
                placeholder="名稱" style={inputSm} />
              <input value={item.amount} onChange={(e) => { const n=[...items]; n[i]={...n[i],amount:e.target.value}; onChange(n); }}
                placeholder="份量" style={{...inputSm,width:80,flexShrink:0}} />
            </>
          ) : (
            <input value={item} onChange={(e) => { const n=[...items]; n[i]=e.target.value; onChange(n); }}
              placeholder={`${placeholder} ${i+1}`} style={inputSm} />
          )}
          <button onClick={() => onChange(items.filter((_,j)=>j!==i))} style={iconBtn}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, twoCol ? {name:"",amount:""} : ""])}
        style={{ background:"none",border:"1.5px dashed #C8B89A",borderRadius:10,padding:"8px",color:"#9B8878",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
        ＋ 新增
      </button>
    </div>
  );
}

const inputSm = { flex:1,padding:"9px 12px",borderRadius:10,border:"1.5px solid #EDE8DF",background:"#fff",fontSize:14,fontFamily:"inherit",color:"#241A10",outline:"none" };
const iconBtn = { background:"#EDE8DF",border:"none",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:12,color:"#9B8878",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" };
const labelSm = { fontSize:10,letterSpacing:2,color:"#B0A090",textTransform:"uppercase",marginBottom:8,display:"block" };
const sectionGap = { marginBottom:22 };

// ── main ──────────────────────────────────────────────────
export default function App() {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [screen, setScreen] = useState("home"); // home | detail
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("sessions");
  const [filter, setFilter] = useState("全部");

  // sheets
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState(null); // editing existing recipe meta

  // new recipe form
  const [draft, setDraft] = useState(blankRecipe());

  // new session form
  const [sessionDraft, setSessionDraft] = useState({ note:"",rating:4,roomTemp:"",doughTemp:"",fermentHours:"" });

  const selected = recipes.find(r => r.id === selectedId);
  const filtered = filter === "全部" ? recipes : recipes.filter(r => r.category === filter);

  // ── recipe CRUD ──
  const saveNewRecipe = () => {
    if (!draft.title.trim()) return;
    setRecipes([{ ...draft, id: Date.now() }, ...recipes]);
    setDraft(blankRecipe());
    setShowAddRecipe(false);
  };

  const deleteRecipe = (id) => setRecipes(recipes.filter(r => r.id !== id));

  const duplicateRecipe = (id) => {
    const src = recipes.find(r => r.id === id);
    if (!src) return;
    const copy = { ...src, id: Date.now(), title: src.title + " (副本)", sessions: [] };
    setRecipes([copy, ...recipes]);
  };

  const updateRecipe = (id, patch) => setRecipes(recipes.map(r => r.id === id ? { ...r, ...patch } : r));

  // ── session CRUD ──
  const saveSession = () => {
    const s = {
      id: Date.now(), date: todayISO(), rating: sessionDraft.rating,
      roomTemp: sessionDraft.roomTemp ? +sessionDraft.roomTemp : null,
      doughTemp: sessionDraft.doughTemp ? +sessionDraft.doughTemp : null,
      fermentHours: sessionDraft.fermentHours ? +sessionDraft.fermentHours : null,
      note: sessionDraft.note, photos: [],
    };
    updateRecipe(selectedId, { sessions: [s, ...(selected?.sessions || [])] });
    setSessionDraft({ note:"",rating:4,roomTemp:"",doughTemp:"",fermentHours:"" });
    setShowAddSession(false);
  };

  const mood = (score) => MOODS.find(m => m.score === score) || MOODS[2];

  // ── HOME ──────────────────────────────────────────────
  if (screen === "home") return (
    <div style={{ fontFamily:"'Georgia',serif",background:"#F9F5EF",minHeight:"100vh",maxWidth:420,margin:"0 auto" }}>
      <style>{css}</style>

      {/* header */}
      <div style={{ padding:"52px 22px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:10,letterSpacing:3,color:"#B0A090",textTransform:"uppercase",marginBottom:4 }}>Kitchen Journal</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#241A10",lineHeight:1.2 }}>我的食譜</div>
        </div>
        <button className="pressable" onClick={() => { setDraft(blankRecipe()); setShowAddRecipe(true); }} style={{
          width:42,height:42,borderRadius:"50%",background:"#241A10",border:"none",
          color:"#F9F5EF",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 4px 14px rgba(36,26,16,0.25)",
        }}>＋</button>
      </div>

      {/* filter */}
      <div style={{ display:"flex",gap:8,padding:"0 22px 18px",overflowX:"auto" }}>
        {["全部",...CATEGORY_OPTS].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding:"7px 16px",borderRadius:20,border:"none",
            background: filter===cat ? "#241A10" : "#fff",
            color: filter===cat ? "#F9F5EF" : "#9B8878",
            fontSize:13,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",
            boxShadow: filter===cat ? "none" : "0 1px 5px rgba(0,0,0,0.07)",
            transition:"all 0.18s",flexShrink:0,
          }}>{cat}</button>
        ))}
      </div>

      {/* hint */}
      <div style={{ fontSize:11,color:"#C0B0A0",textAlign:"center",marginBottom:12 }}>← 右滑複製　左滑刪除 →</div>

      {/* cards */}
      <div style={{ padding:"0 22px",paddingBottom:40 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center",padding:"60px 0",color:"#C0B0A0",fontSize:14 }}>還沒有食譜，點右上角 ＋ 新增吧！</div>
        )}
        {filtered.map(recipe => {
          const latest = recipe.sessions[0];
          const cs = CAT_STYLE[recipe.category] || CAT_STYLE["其他"];
          const m = latest ? mood(latest.rating) : null;
          return (
            <SwipeCard key={recipe.id} onDelete={() => deleteRecipe(recipe.id)} onDuplicate={() => duplicateRecipe(recipe.id)}>
              <div className="pressable" onClick={() => { setSelectedId(recipe.id); setActiveTab("sessions"); setScreen("detail"); }}
                style={{ background:"#fff",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 14px rgba(0,0,0,0.07)",cursor:"pointer" }}>
                {/* cover */}
                <div style={{ background:recipe.coverColor,padding:"20px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div style={{ fontSize:46 }}>{recipe.emoji}</div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#fff" }}>{recipe.sessions.length} 次</span>
                    {m && (
                      <div style={{ marginTop:8,textAlign:"right" }}>
                        <div style={{ fontSize:26 }}>{m.emoji}</div>
                        <div style={{ fontSize:10,color:"rgba(255,255,255,0.75)",marginTop:2 }}>{m.label}</div>
                      </div>
                    )}
                  </div>
                </div>
                {/* body */}
                <div style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"#241A10" }}>{recipe.title}</div>
                    <span style={{ fontSize:11,background:cs.bg,color:cs.text,padding:"3px 10px",borderRadius:10,fontWeight:600 }}>{recipe.category}</span>
                  </div>
                  {latest && (
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                      <span style={{ fontSize:12 }}>🕐</span>
                      <span style={{ fontSize:12,color:"#B0A090" }}>{fmtDate(latest.date)}</span>
                      {latest.roomTemp && <><span style={{ color:"#D8CFC4",fontSize:12 }}>·</span><span style={{ fontSize:12,color:"#B0A090" }}>🌡 {latest.roomTemp}°C</span></>}
                    </div>
                  )}
                  {latest?.note && (
                    <div style={{ fontSize:13,color:"#9B8878",lineHeight:1.55 }}>
                      {latest.note.length > 70 ? latest.note.slice(0,70)+"…" : latest.note}
                    </div>
                  )}
                </div>
              </div>
            </SwipeCard>
          );
        })}
      </div>

      {/* ADD RECIPE SHEET */}
      {showAddRecipe && (
        <Sheet title="新增食譜" onClose={() => setShowAddRecipe(false)}>
          <AddRecipeForm draft={draft} setDraft={setDraft} onSave={saveNewRecipe} />
        </Sheet>
      )}
    </div>
  );

  // ── DETAIL ────────────────────────────────────────────
  if (screen === "detail" && selected) return (
    <div style={{ fontFamily:"'Georgia',serif",background:"#F9F5EF",minHeight:"100vh",maxWidth:420,margin:"0 auto" }}>
      <style>{css}</style>

      {/* hero */}
      <div style={{ background:selected.coverColor,padding:"52px 22px 20px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <button className="pressable" onClick={() => setScreen("home")} style={{ background:"rgba(255,255,255,0.18)",border:"none",color:"#fff",padding:"7px 14px",borderRadius:16,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>← 返回</button>
          <button className="pressable" onClick={() => { setDraft({...selected}); setEditRecipeId(selected.id); }} style={{ background:"rgba(255,255,255,0.18)",border:"none",color:"#fff",padding:"7px 14px",borderRadius:16,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>編輯食譜</button>
        </div>
        <div style={{ marginTop:14,fontSize:44 }}>{selected.emoji}</div>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",marginTop:6 }}>{selected.title}</div>
        <div style={{ fontSize:12,color:"rgba(255,255,255,0.65)",marginTop:4 }}>{selected.sessions.length} 次嘗試紀錄</div>
        <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" }}>
          {selected.tags.map(t => (
            <span key={t} style={{ fontSize:11,background:"rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px",borderRadius:10 }}>#{t}</span>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display:"flex",background:"#fff",borderBottom:"1px solid #EDE8DF",overflowX:"auto" }}>
        {[{key:"sessions",label:"嘗試紀錄"},{key:"steps",label:"步驟"},{key:"ingredients",label:"材料"},{key:"shopping",label:"採購"}].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex:"0 0 auto",padding:"13px 18px",border:"none",background:"transparent",
            color:activeTab===tab.key ? "#241A10" : "#B0A090",
            fontSize:13,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",
            borderBottom:activeTab===tab.key ? "2px solid #241A10" : "2px solid transparent",
            fontWeight:activeTab===tab.key ? 700 : 400,transition:"all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding:"20px 22px",paddingBottom:60 }}>
        {/* SESSIONS */}
        {activeTab==="sessions" && <SessionsTab selected={selected} updateRecipe={updateRecipe} showAddSession={() => setShowAddSession(true)} mood={mood} />}
        {/* STEPS */}
        {activeTab==="steps" && (
          <EditableDetailList
            title="步驟"
            items={selected.steps}
            onChange={v => updateRecipe(selected.id,{steps:v})}
            renderItem={(s,i) => (
              <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
                <div style={{ width:26,height:26,borderRadius:"50%",background:selected.coverColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:14,color:"#3D2E1E",lineHeight:1.7,paddingTop:3 }}>{s}</div>
              </div>
            )}
            editItem={(s,i,onChange) => (
              <textarea rows={2} value={s} onChange={e=>onChange(e.target.value)}
                style={{ flex:1,padding:"9px 12px",borderRadius:10,border:"1.5px solid #EDE8DF",background:"#fff",fontSize:14,fontFamily:"inherit",color:"#241A10",outline:"none",resize:"none",lineHeight:1.6 }} />
            )}
            newItem=""
            placeholder="新增步驟"
          />
        )}
        {/* INGREDIENTS */}
        {activeTab==="ingredients" && (
          <EditableDetailList
            title="材料"
            items={selected.ingredients}
            onChange={v => updateRecipe(selected.id,{ingredients:v})}
            renderItem={(ing) => (
              <div style={{ display:"flex",justifyContent:"space-between",padding:"2px 0" }}>
                <span style={{ fontSize:14,color:"#3D2E1E" }}>{ing.name}</span>
                <span style={{ fontSize:14,color:"#9B8878",fontWeight:600 }}>{ing.amount}</span>
              </div>
            )}
            editItem={(ing,i,onChange) => (
              <div style={{ display:"flex",gap:8,flex:1 }}>
                <input value={ing.name} onChange={e=>onChange({...ing,name:e.target.value})} placeholder="名稱" style={inputSm} />
                <input value={ing.amount} onChange={e=>onChange({...ing,amount:e.target.value})} placeholder="份量" style={{...inputSm,width:80,flex:"none"}} />
              </div>
            )}
            newItem={{name:"",amount:""}}
            placeholder="新增材料"
          />
        )}
        {/* SHOPPING */}
        {activeTab==="shopping" && (
          <EditableDetailList
            title="採購清單"
            items={selected.shopping}
            onChange={v => updateRecipe(selected.id,{shopping:v})}
            renderItem={(item) => (
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:18,height:18,borderRadius:5,border:`2px solid ${selected.coverColor}`,flexShrink:0 }} />
                <span style={{ fontSize:14,color:"#3D2E1E" }}>{item}</span>
              </div>
            )}
            editItem={(item,i,onChange) => (
              <input value={item} onChange={e=>onChange(e.target.value)} placeholder="食材名稱" style={inputSm} />
            )}
            newItem=""
            placeholder="新增食材"
          />
        )}
      </div>

      {/* ADD SESSION SHEET */}
      {showAddSession && (
        <Sheet title="新增嘗試紀錄" onClose={() => setShowAddSession(false)} accentColor={selected.coverColor}>
          <SessionForm
            draft={sessionDraft} setDraft={setSessionDraft}
            isBread={selected.category==="麵包"}
            accentColor={selected.coverColor}
            onSave={saveSession}
          />
        </Sheet>
      )}

      {/* EDIT RECIPE SHEET */}
      {editRecipeId && (
        <Sheet title="編輯食譜" onClose={() => setEditRecipeId(null)}>
          <AddRecipeForm draft={draft} setDraft={setDraft} onSave={() => {
            updateRecipe(editRecipeId, draft);
            setEditRecipeId(null);
          }} saveLabel="儲存修改" />
        </Sheet>
      )}
    </div>
  );

  return null;
}

// ── SessionsTab ───────────────────────────────────────────
function SessionsTab({ selected, updateRecipe, showAddSession, mood }) {
  const deleteSession = (sid) => {
    updateRecipe(selected.id, { sessions: selected.sessions.filter(s => s.id !== sid) });
  };

  return (
    <div>
      <button className="pressable" onClick={showAddSession} style={{
        width:"100%",padding:"13px",borderRadius:14,
        border:"2px dashed #C8B89A",background:"transparent",
        color:"#9B8878",fontSize:14,fontFamily:"inherit",cursor:"pointer",
        marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
      }}>
        <span style={{ fontSize:18 }}>＋</span> 新增這次的嘗試
      </button>

      {selected.sessions.length === 0 && (
        <div style={{ textAlign:"center",padding:"40px 0",color:"#C0B0A0",fontSize:14 }}>還沒有嘗試紀錄</div>
      )}

      {selected.sessions.map((s, i) => {
        const m = mood(s.rating);
        return (
          <div key={s.id} style={{
            background:"#fff",borderRadius:18,padding:"18px",marginBottom:14,
            boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
            borderLeft:`4px solid ${i===0 ? selected.coverColor : "#EDE8DF"}`,
            position:"relative",
          }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12,color:"#B0A090",display:"flex",alignItems:"center",gap:5 }}>
                  {i===0 && <span style={{ fontSize:10,background:selected.coverColor,color:"#fff",padding:"2px 8px",borderRadius:8 }}>最新</span>}
                  <span>🕐 {fmtDate(s.date)}</span>
                  <span style={{ color:"#D8CFC4" }}>·</span>
                  <span>第 {selected.sessions.length - i} 次</span>
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:24 }}>{m.emoji}</div>
                  <div style={{ fontSize:10,color:"#9B8878" }}>{m.label}</div>
                </div>
                <button onClick={() => deleteSession(s.id)} style={{ ...iconBtn,marginLeft:4 }}>✕</button>
              </div>
            </div>

            {(s.roomTemp || s.doughTemp || s.fermentHours) && (
              <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                {s.roomTemp && <TempChip label="室內" value={`${s.roomTemp}°C`} />}
                {s.doughTemp && <TempChip label="麵團" value={`${s.doughTemp}°C`} />}
                {s.fermentHours && <TempChip label="發酵" value={`${s.fermentHours}h`} />}
              </div>
            )}

            <div style={{ fontSize:14,color:"#4A3828",lineHeight:1.7,background:"#FDFAF5",borderRadius:10,padding:"12px 14px" }}>
              {s.note || <span style={{ color:"#C0B0A0",fontStyle:"italic" }}>沒有留下筆記</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TempChip({ label, value }) {
  return (
    <div style={{ flex:1,background:"#F5F0E8",borderRadius:10,padding:"8px 10px",textAlign:"center" }}>
      <div style={{ fontSize:10,color:"#B0A090",marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:16,fontWeight:700,color:"#241A10" }}>{value}</div>
    </div>
  );
}

// ── EditableDetailList ────────────────────────────────────
function EditableDetailList({ title, items, onChange, renderItem, editItem, newItem, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  const startEdit = () => { setLocalItems([...items]); setEditing(true); };
  const saveEdit = () => { onChange(localItems.filter(it => typeof it === "string" ? it.trim() : it.name?.trim())); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  // keep in sync if parent changes
  const itemsRef = useRef(items);
  if (!editing && items !== itemsRef.current) { itemsRef.current = items; }

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <span style={{ fontSize:10,letterSpacing:2,color:"#B0A090",textTransform:"uppercase" }}>{title}</span>
        {editing
          ? <div style={{ display:"flex",gap:8 }}>
              <button onClick={cancelEdit} style={{ fontSize:12,color:"#9B8878",background:"#EDE8DF",border:"none",padding:"5px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit" }}>取消</button>
              <button onClick={saveEdit} style={{ fontSize:12,color:"#fff",background:"#241A10",border:"none",padding:"5px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit" }}>儲存</button>
            </div>
          : <button onClick={startEdit} style={{ fontSize:12,color:"#9B8878",background:"#EDE8DF",border:"none",padding:"5px 12px",borderRadius:10,cursor:"pointer",fontFamily:"inherit" }}>✏️ 編輯</button>
        }
      </div>

      {!editing && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {items.map((item,i) => (
            <div key={i} style={{ padding:"4px 0",borderBottom:i<items.length-1?"1px solid #F0EBE3":"none" }}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {localItems.map((item, i) => (
            <div key={i} style={{ display:"flex",gap:8,alignItems:"center" }}>
              {editItem(item, i, (val) => { const n=[...localItems]; n[i]=val; setLocalItems(n); })}
              <button onClick={() => setLocalItems(localItems.filter((_,j)=>j!==i))} style={iconBtn}>✕</button>
            </div>
          ))}
          <button onClick={() => setLocalItems([...localItems, newItem])}
            style={{ background:"none",border:"1.5px dashed #C8B89A",borderRadius:10,padding:"9px",color:"#9B8878",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
            ＋ {placeholder}
          </button>
        </div>
      )}
    </div>
  );
}

// ── SessionForm ───────────────────────────────────────────
function SessionForm({ draft, setDraft, isBread, accentColor, onSave }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return (
    <div>
      <div style={sectionGap}>
        <span style={labelSm}>這次感覺如何？</span>
        <div style={{ display:"flex",gap:8 }}>
          {MOODS.map(m => (
            <button key={m.score} onClick={() => set("rating", m.score)} style={{
              flex:1,padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer",
              background: draft.rating===m.score ? accentColor : "#EDE8DF",
              transition:"all 0.15s", display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            }}>
              <span style={{ fontSize:22 }}>{m.emoji}</span>
              <span style={{ fontSize:10,color: draft.rating===m.score ? "#fff" : "#9B8878" }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isBread && (
        <div style={sectionGap}>
          <span style={labelSm}>環境條件</span>
          <div style={{ display:"flex",gap:10 }}>
            {[{k:"roomTemp",l:"室內溫度 °C"},{k:"doughTemp",l:"麵團溫度 °C"},{k:"fermentHours",l:"發酵時間 h"}].map(f => (
              <div key={f.k} style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"#B0A090",marginBottom:5 }}>{f.l}</div>
                <input type="number" placeholder="—" value={draft[f.k]} onChange={e=>set(f.k,e.target.value)}
                  style={{ ...inputSm,textAlign:"center",padding:"10px 6px" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sectionGap}>
        <span style={labelSm}>心得與調整筆記</span>
        <textarea rows={5} placeholder="這次有什麼發現？下次想改什麼？" value={draft.note} onChange={e=>set("note",e.target.value)}
          style={{ width:"100%",padding:"14px",borderRadius:14,border:"1.5px solid #EDE8DF",background:"#fff",fontSize:14,fontFamily:"inherit",color:"#241A10",lineHeight:1.7,outline:"none",resize:"none",boxSizing:"border-box" }} />
      </div>

      <button className="pressable" onClick={onSave} style={{ width:"100%",padding:"15px",borderRadius:16,border:"none",background:accentColor,color:"#fff",fontSize:15,fontFamily:"inherit",fontWeight:700,cursor:"pointer" }}>
        儲存紀錄
      </button>
    </div>
  );
}

// ── AddRecipeForm ─────────────────────────────────────────
function AddRecipeForm({ draft, setDraft, onSave, saveLabel="建立食譜" }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
    setTagInput("");
  };

  return (
    <div>
      {/* emoji picker */}
      <div style={sectionGap}>
        <span style={labelSm}>封面圖示</span>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {EMOJI_OPTS.map(e => (
            <button key={e} onClick={() => set("emoji",e)} style={{
              width:40,height:40,borderRadius:10,border:"none",fontSize:22,cursor:"pointer",
              background: draft.emoji===e ? "#241A10" : "#EDE8DF",
              transition:"all 0.15s",
            }}>{e}</button>
          ))}
        </div>
      </div>

      {/* color picker */}
      <div style={sectionGap}>
        <span style={labelSm}>封面顏色</span>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {COVER_COLORS.map(c => (
            <button key={c} onClick={() => set("coverColor",c)} style={{
              width:34,height:34,borderRadius:"50%",background:c,border:"none",cursor:"pointer",
              outline: draft.coverColor===c ? "3px solid #241A10" : "none",
              outlineOffset:2,transition:"outline 0.15s",
            }} />
          ))}
        </div>
      </div>

      {/* title */}
      <div style={sectionGap}>
        <span style={labelSm}>食譜名稱</span>
        <input value={draft.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. 鄉村酸種麵包"
          style={{ ...inputSm,width:"100%",padding:"12px 14px",borderRadius:12 }} />
      </div>

      {/* category */}
      <div style={sectionGap}>
        <span style={labelSm}>分類</span>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {CATEGORY_OPTS.map(cat => (
            <button key={cat} onClick={() => set("category",cat)} style={{
              padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,
              background: draft.category===cat ? "#241A10" : "#EDE8DF",
              color: draft.category===cat ? "#fff" : "#9B8878",
              transition:"all 0.15s",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* tags */}
      <div style={sectionGap}>
        <span style={labelSm}>標籤（選填）</span>
        <div style={{ display:"flex",gap:8,marginBottom:8,flexWrap:"wrap" }}>
          {draft.tags.map(t => (
            <span key={t} style={{ fontSize:12,background:"#F5F0E8",color:"#8B7860",padding:"4px 10px",borderRadius:10,display:"flex",alignItems:"center",gap:5 }}>
              #{t}
              <button onClick={() => set("tags",draft.tags.filter(x=>x!==t))} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#B0A090",padding:0,lineHeight:1 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()}
            placeholder="輸入標籤後按 Enter" style={{ ...inputSm,flex:1 }} />
          <button onClick={addTag} style={{ padding:"9px 14px",borderRadius:10,border:"none",background:"#241A10",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"inherit" }}>加入</button>
        </div>
      </div>

      {/* ingredients */}
      <div style={sectionGap}>
        <span style={labelSm}>材料</span>
        <EditableList items={draft.ingredients} onChange={v=>set("ingredients",v)} twoCol />
      </div>

      {/* steps */}
      <div style={sectionGap}>
        <span style={labelSm}>步驟</span>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {draft.steps.map((s,i) => (
            <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
              <div style={{ width:24,height:24,borderRadius:"50%",background:draft.coverColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,marginTop:10 }}>{i+1}</div>
              <textarea rows={2} value={s} onChange={e=>{ const n=[...draft.steps]; n[i]=e.target.value; set("steps",n); }}
                placeholder={`步驟 ${i+1}`} style={{ flex:1,padding:"9px 12px",borderRadius:10,border:"1.5px solid #EDE8DF",background:"#fff",fontSize:14,fontFamily:"inherit",color:"#241A10",outline:"none",resize:"none",lineHeight:1.6 }} />
              <button onClick={() => set("steps",draft.steps.filter((_,j)=>j!==i))} style={iconBtn}>✕</button>
            </div>
          ))}
          <button onClick={() => set("steps",[...draft.steps,""])}
            style={{ background:"none",border:"1.5px dashed #C8B89A",borderRadius:10,padding:"9px",color:"#9B8878",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>＋ 新增步驟</button>
        </div>
      </div>

      {/* shopping */}
      <div style={sectionGap}>
        <span style={labelSm}>採購清單（選填）</span>
        <EditableList items={draft.shopping} onChange={v=>set("shopping",v)} placeholder="食材" />
      </div>

      <button className="pressable" onClick={onSave}
        style={{ width:"100%",padding:"15px",borderRadius:16,border:"none",background: draft.title.trim() ? "#241A10" : "#C8BDB0",color:"#fff",fontSize:15,fontFamily:"inherit",fontWeight:700,cursor:"pointer",transition:"background 0.2s" }}>
        {saveLabel}
      </button>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { display: none; }
  .pressable { transition: transform 0.15s, opacity 0.15s; }
  .pressable:active { transform: scale(0.97); opacity: 0.7; }
  @keyframes slideUp { from { transform:translateY(24px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes sheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
  .slide-up { animation: slideUp 0.3s ease forwards; }
  .sheet-up { animation: sheetUp 0.32s cubic-bezier(.2,.8,.3,1) forwards; }
  textarea, input { font-family: 'Georgia', serif; }
`;
