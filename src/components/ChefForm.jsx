import { useState, useEffect } from 'react'
import { addMeal, getMeals, deleteMeal } from '../services/api'

const MEAL_TYPES = [
  { id: lang === 'ru' ? 'завтрак' : 'breakfast', label: lang === 'ru' ? 'завтрак' : 'breakfast', icon: 13 },
  { id: lang === 'ru' ? 'обед' : 'lunch',    label: lang === 'ru' ? 'обед' : 'lunch',    icon: 14 },
  { id: lang === 'ru' ? 'ужин' : 'dinner',    label: lang === 'ru' ? 'ужин' : 'dinner',    icon: 15 },
  { id: lang === 'ru' ? 'перекус' : 'snack', label: lang === 'ru' ? 'перекус' : 'snack', icon: 16 },
]

// Безопасная работа с localStorage — Telegram WebApp может блокировать
function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function loadRecipes(gremlinId) { return safeGet('recipes_' + gremlinId) }
function saveRecipes(gremlinId, recipes) { safeSet('recipes_' + gremlinId, recipes) }

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function ChefForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [tab, setTab] = useState('meal')
  // Рецепты храним в stats гремлина через updateGremlin
  const [recipes, setRecipes] = useState(() => {
    try {
      const stored = localStorage.getItem('recipes_' + gremlinId)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [newRecipeName, setNewRecipeName] = useState('')
  const [newRecipeText, setNewRecipeText] = useState('')
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState(lang === 'ru' ? 'обед' : 'lunch')
  const [weight, setWeight] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [kbjuMode, setKbjuMode] = useState('auto') // 'auto' | 'manual'
  const [calcLoading, setCalcLoading] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMeals() }, [gremlinId])

  const loadMeals = async () => {
    try {
      const data = await getMeals(gremlinId)
      setMeals(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Авто-расчёт КБЖУ через бэкенд (Groq)
  const calcKBJU = async () => {
    if (!name.trim()) return
    setCalcLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/meals/calc-kbju`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), weight_g: weight ? parseInt(weight) : null })
      })
      const data = await res.json()
      if (data.calories) setCalories(String(data.calories))
      if (data.protein)  setProtein(String(data.protein))
      if (data.carbs)    setCarbs(String(data.carbs))
      if (data.fat)      setFat(String(data.fat))
      if (data.weight_g && !weight) setWeight(String(data.weight_g))
    } catch (e) {
      console.error('KBJU calc error:', e)
    }
    setCalcLoading(false)
  }

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) { setError('Укажи название блюда'); return }
    setSaving(true)
    try {
      // Авто-расчёт КБЖУ если режим авто и ещё не рассчитано
      let finalCalories = calories ? parseInt(calories) : null
      let finalProtein  = protein  ? parseFloat(protein)  : null
      let finalCarbs    = carbs    ? parseFloat(carbs)    : null
      let finalFat      = fat      ? parseFloat(fat)      : null

      if (kbjuMode === 'auto' && !finalCalories) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/meals/calc-kbju`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), weight_g: weight ? parseInt(weight) : null })
          })
          const data = await res.json()
          if (data.calories) { finalCalories = data.calories; setCalories(String(data.calories)) }
          if (data.protein)  { finalProtein  = data.protein;  setProtein(String(data.protein))   }
          if (data.carbs)    { finalCarbs    = data.carbs;    setCarbs(String(data.carbs))        }
          if (data.fat)      { finalFat      = data.fat;      setFat(String(data.fat))            }
        } catch {}
      }

      const result = await addMeal(gremlinId, {
        name: name.trim(), meal_type: mealType,
        calories: finalCalories,
        protein:  finalProtein,
        carbs:    finalCarbs,
        fat:      finalFat,
        weight_g: weight ? parseInt(weight) : null,
        note: note.trim() || null, date,
      })
      if (result?.meal) setMeals(m => [result.meal, ...m])
      if (result?.stats) onStatsUpdate(result.stats)
      setName(''); setCalories(''); setProtein(''); setCarbs('')
      setFat(''); setWeight(''); setNote(''); setDate(todayStr())
    } catch (e) { console.error(e); setError(lang === 'ru' ? 'Ошибка сохранения' : 'Save error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteMeal(id, gremlinId)
      setMeals(m => m.filter(x => x.id !== id))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch (e) { console.error(e) }
  }

  const inp = (val, set, ph, label, mode = 'decimal') => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <input type="text" inputMode={mode} value={val} onChange={e => set(e.target.value)} placeholder={ph}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  // Дневные итоги
  const today = meals.filter(m => m.date === date)
  const todayKcal = today.reduce((s, m) => s + (m.calories || 0), 0)
  const todayProtein = today.reduce((s, m) => s + (m.protein || 0), 0)
  const todayCarbs = today.reduce((s, m) => s + (m.carbs || 0), 0)
  const todayFat = today.reduce((s, m) => s + (m.fat || 0), 0)

  // Недельные итоги
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekStr = weekAgo.toISOString().split('T')[0]
  const weekMeals = meals.filter(m => m.date >= weekStr)
  const weekKcal = weekMeals.reduce((s, m) => s + (m.calories || 0), 0)
  const weekProtein = weekMeals.reduce((s, m) => s + (m.protein || 0), 0)

  const addRecipe = () => {
    if (!newRecipeName.trim()) return
    const updated = [{ id: Date.now(), name: newRecipeName.trim(), text: newRecipeText.trim(), created: todayStr() }, ...recipes]
    setRecipes(updated)
    saveRecipes(gremlinId, updated)
    setNewRecipeName(''); setNewRecipeText('')
  }

  const deleteRecipe = (id) => {
    const updated = recipes.filter(r => r.id !== id)
    setRecipes(updated)
    saveRecipes(gremlinId, updated)
  }

  // Использовать рецепт — заполнить название блюда
  const useRecipe = (recipe) => {
    setName(recipe.name)
    setTab('meal')
  }

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Табы еда / рецепты */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
      {[['meal', 5, 'Приём пищи'], ['recipes', 12, 'Рецепты']].map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '7px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: tab === id ? accentColor : 'transparent', color: tab === id ? '#000' : 'var(--text-muted)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <img src={`/Icons/${icon}.png`} style={{ width: 13, height: 13 }} />{label}
          </button>
        ))}
      </div>

      {/* TAB: РЕЦЕПТЫ */}
      {tab === 'recipes' && (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ДОБАВИТЬ РЕЦЕПТ</div>
          <input type="text" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} placeholder="Название рецепта..."
            style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
          />
          <textarea value={newRecipeText} onChange={e => setNewRecipeText(e.target.value)} rows={4} placeholder="Ингредиенты и способ приготовления..."
            style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none', resize: 'none' }}
          />
          <button onClick={addRecipe} disabled={!newRecipeName.trim()}
            style={{ background: newRecipeName.trim() ? accentColor : 'var(--bg3)', color: newRecipeName.trim() ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            СОХРАНИТЬ РЕЦЕПТ
          </button>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.06em' }}>МОИ РЕЦЕПТЫ ({recipes.length})</div>

          {recipes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
              Рецептов пока нет. Можешь попросить гремлина предложить рецепт в чате.
            </div>
          ) : recipes.map(r => (
            <div key={r.id} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: r.text ? 6 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => useRecipe(r)}
                    style={{ background: accentColor + '20', border: '1px solid ' + accentColor + '40', color: accentColor, borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    использовать
                  </button>
                  <button onClick={() => deleteRecipe(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
                </div>
              </div>
              {r.text && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.text}</div>}
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{r.created}</div>
            </div>
          ))}
        </>
      )}

      {/* TAB: ПРИЁМ ПИЩИ */}
      {tab === 'meal' && (<>
      {todayKcal > 0 && (
        <div style={{ background: accentColor + '10', borderRadius: 8, border: '1px solid ' + accentColor + '20', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { val: todayKcal, label: 'ккал сегодня' },
              { val: Math.round(todayProtein) + 'г', label: 'белок' },
              { val: Math.round(todayCarbs) + 'г', label: 'углев' },
              { val: Math.round(todayFat) + 'г', label: 'жир' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: i < 3 ? '1px solid ' + accentColor + '15' : 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>{s.val}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {weekKcal > 0 && (
            <div style={{ borderTop: '1px solid ' + accentColor + '15', padding: '5px 12px', display: 'flex', gap: 12, fontSize: 9, color: 'var(--text-muted)' }}>
              <span>7 дней:</span>
              <span style={{ color: accentColor }}>{weekKcal} ккал</span>
              <span>Б {Math.round(weekProtein)}г</span>
              <span>~{Math.round(weekKcal / 7)} ккал/день</span>
            </div>
          )}
        </div>
      )}

      {/* Название блюда */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>БЛЮДО</div>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={lang === 'ru' ? 'овсянка, куриная грудка...' : 'oatmeal, chicken breast...'}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }}
        />
      </div>

      {/* Тип приёма */}
      <div style={{ display: 'flex', gap: 5 }}>
        {MEAL_TYPES.map(mt => (
          <button key={mt.id} onClick={() => setMealType(mt.id)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: mealType === mt.id ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (mealType === mt.id ? accentColor + '70' : 'var(--border)'), color: mealType === mt.id ? accentColor : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <img src={`/Icons/${mt.icon}.png`} style={{ width: 13, height: 13 }} />
            {mt.label}
          </button>
        ))}
      </div>

      {/* Граммы — основное поле */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ГРАММЫ (ПОРЦИЯ)</div>
        <input type="text" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
          placeholder="200"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 16, outline: 'none' }}
        />
      </div>

      {/* КБЖУ — авто/ручной */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>КБЖУ</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setKbjuMode('auto')}
              style={{ padding: '3px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', background: kbjuMode === 'auto' ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (kbjuMode === 'auto' ? accentColor + '70' : 'var(--border)'), color: kbjuMode === 'auto' ? accentColor : 'var(--text-muted)', fontWeight: kbjuMode === 'auto' ? 700 : 400 }}>
              авто
            </button>
            <button onClick={() => setKbjuMode('manual')}
              style={{ padding: '3px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', background: kbjuMode === 'manual' ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (kbjuMode === 'manual' ? accentColor + '70' : 'var(--border)'), color: kbjuMode === 'manual' ? accentColor : 'var(--text-muted)', fontWeight: kbjuMode === 'manual' ? 700 : 400 }}>
              вручную
            </button>
          </div>
        </div>

        {kbjuMode === 'auto' ? (
          <button onClick={calcKBJU} disabled={!name.trim() || calcLoading}
            style={{ width: '100%', background: name.trim() ? accentColor + '15' : 'var(--bg3)', border: '1px solid ' + (name.trim() ? accentColor + '40' : 'var(--border)'), borderRadius: 8, padding: '10px', fontSize: 12, color: name.trim() ? accentColor : 'var(--text-muted)', cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {calcLoading ? '... считаю' : calories ? `✓ ${calories} ккал · Б${protein}г · У${carbs}г · Ж${fat}г` : <><img src="/Icons/18.png" style={{ width: 13, height: 13, verticalAlign: 'middle', marginRight: 4 }} />рассчитать КБЖУ автоматически</>}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              [calories, setCalories, '300', lang === 'ru' ? 'ККАЛ' : 'KCAL'],
              [protein, setProtein, '25', lang === 'ru' ? 'БЕЛОК' : 'PROTEIN'],
              [carbs, setCarbs, '40', lang === 'ru' ? 'УГЛЕВ' : 'CARBS'],
              [fat, setFat, '10', 'ЖИР'],
            ].map(([val, set, ph, label]) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <input type="text" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '8px 6px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Заметка + дата */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка..."
          style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}
        />
      </div>

      {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving || !name.trim()}
        style={{ background: name.trim() ? accentColor : 'var(--bg3)', color: name.trim() ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
        {saving ? '...' : lang === 'ru' ? 'ЗАПИСАТЬ' : 'SAVE'}
      </button>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>ИСТОРИЯ ПИТАНИЯ</div>

      {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
        : meals.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Пока нет записей</div>
        : meals.slice(0, 30).map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ flexShrink: 0 }}>
              <img src={`/Icons/${m.meal_type === lang === 'ru' ? 'завтрак' : 'breakfast' ? 13 : m.meal_type === lang === 'ru' ? 'обед' : 'lunch' ? 14 : m.meal_type === lang === 'ru' ? 'ужин' : 'dinner' ? 15 : 16}.png`} style={{ width: 16, height: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                {m.calories ? <span style={{ color: accentColor }}>{m.calories} ккал</span> : null}
                {m.protein ? <span>Б{Math.round(m.protein)}г</span> : null}
                {m.date && <span>{m.date}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
          </div>
        ))}
      </>)}
    </div>
  )
}
