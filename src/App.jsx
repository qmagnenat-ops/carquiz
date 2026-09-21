import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { vehicles } from "./vehicles";

const questions = [
  { key: "budget", title: "Quel est votre budget ?", subtitle: "Le prix cible nous aide à affiner les recommandations.", options: [["low", "Moins de 20 000 €"], ["mid", "20 000 – 35 000 €"], ["high", "35 000 – 55 000 €"], ["premium", "Plus de 55 000 €"]] },
  { key: "bodyType", title: "Quelle carrosserie vous attire ?", subtitle: "Choisissez le format qui correspond à votre quotidien.", options: [["citadine", "Citadine"], ["berline", "Berline"], ["suv", "SUV"], ["break", "Break"], ["coupe", "Coupé / cabriolet"], ["monospace", "Monospace"], ["pickup", "Pick-up"]] },
  { key: "fuel", title: "Quelle motorisation préférez-vous ?", subtitle: "Vous pouvez choisir l'énergie qui vous convient le mieux.", options: [["essence", "Essence"], ["diesel", "Diesel"], ["hybrid", "Hybride"], ["plug-in", "Hybride rechargeable"], ["electric", "Électrique"], ["any", "Je suis ouvert"]] },
  { key: "drivetrain", title: "Quelle transmission souhaitez-vous ?", subtitle: "La transmission change le comportement et l'adhérence.", options: [["Traction", "Traction avant"], ["Propulsion", "Propulsion"], ["AWD", "Intégrale / 4x4"], ["any", "Sans préférence"]] },
  { key: "power", title: "Quel niveau de puissance recherchez-vous ?", subtitle: "De l'efficacité à la performance pure.", options: [["eco", "Économique"], ["balanced", "Équilibrée"], ["sport", "Sportive"], ["powerful", "Très puissante"]] },
  { key: "seats", title: "De combien de places avez-vous besoin ?", subtitle: "Pensez à vos passagers habituels et à vos projets.", options: [["2", "2 places"], ["4", "4 places"], ["5", "5 places"], ["7", "7 places ou plus"]] },
  { key: "usage", title: "Quel sera votre usage principal ?", subtitle: "Nous adapterons les suggestions à votre mode de vie.", options: [["city", "Ville"], ["highway", "Autoroute / longs trajets"], ["family", "Familial"], ["sport", "Sport / loisir"], ["pro", "Professionnel"]] },
  { key: "priorities", title: "Quelles sont vos priorités ?", subtitle: "Sélectionnez jusqu'à 3 critères importants.", multi: true, options: [["ecology", "Consommation / écologie"], ["comfort", "Confort"], ["performance", "Performances"], ["space", "Coffre / espace"], ["tech", "Technologie"], ["reliability", "Fiabilité"]] }
];

function scoreVehicle(vehicle, answers) {
  let score = 0;
  const reasons = [];
  const budget = { low: [0, 20000], mid: [20000, 35000], high: [35000, 55000], premium: [55000, Infinity] }[answers.budget];
  if (budget) { const distance = vehicle.price < budget[0] ? budget[0] - vehicle.price : vehicle.price > budget[1] ? vehicle.price - budget[1] : 0; score += distance === 0 ? 25 : Math.max(0, 25 - distance / 1200); if (distance === 0) reasons.push("dans votre budget"); }
  if (answers.bodyType === vehicle.bodyType || (answers.bodyType === "coupe" && ["coupe", "convertible"].includes(vehicle.bodyType))) { score += 20; reasons.push("carrosserie adaptée"); }
  if (answers.fuel === "any" || answers.fuel === vehicle.fuel) { score += 15; reasons.push("motorisation correspondante"); }
  if (answers.drivetrain === "any" || answers.drivetrain === vehicle.drivetrain) score += 8;
  if (answers.usage === vehicle.usage) { score += 12; reasons.push("usage compatible"); }
  const powerRanges = { eco: [0, 110], balanced: [110, 200], sport: [200, 320], powerful: [320, Infinity] };
  if (powerRanges[answers.power] && vehicle.power >= powerRanges[answers.power][0] && vehicle.power < powerRanges[answers.power][1]) score += 8;
  if ((answers.seats === "7" && vehicle.seats >= 7) || answers.seats === String(vehicle.seats) || (answers.seats === "5" && vehicle.seats >= 5)) score += 7;
  const priorityMap = { ecology: ["electric", "hybrid", "plug-in"], performance: vehicle.power > 200, reliability: vehicle.reliability > 0.8, space: vehicle.seats >= 5 || ["suv", "break", "monospace", "pickup"].includes(vehicle.bodyType), comfort: vehicle.premium, tech: vehicle.premium };
  (answers.priorities || []).forEach((priority) => { if ((Array.isArray(priorityMap[priority]) && priorityMap[priority].includes(vehicle.fuel)) || priorityMap[priority] === true) score += 1.7; });
  return { ...vehicle, score: Math.min(99, Math.round(score)), reasons };
}

function getAutoScoutUrl(car) {
  const slug = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const modelSlugs = {
    "RAV4": "rav-4",
    "Série 3": "serie-3",
    "Série 5 Touring": "serie-5-touring",
    "Classe C": "classe-c",
    "C5 Aircross": "c5-aircross",
    "MX-5": "mx-5",
    "718 Cayman": "718-cayman",
    "Model 3": "model-3",
    "Model Y": "model-y"
  };

  const brand = slug(car.brand);
  const model = modelSlugs[car.model] || slug(car.model);

  return `https://www.autoscout24.ch/fr/voitures/${brand}/${model}`;
}

const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='500' viewBox='0 0 900 500'%3E%3Crect width='900' height='500' fill='%23e8eee4'/%3E%3Cpath d='M170 315h560l-55-100H285l-115 100z' fill='%237aa361'/%3E%3Ccircle cx='285' cy='325' r='42' fill='%23283b2d'/%3E%3Ccircle cx='615' cy='325' r='42' fill='%23283b2d'/%3E%3Ctext x='450' y='120' text-anchor='middle' font-family='Arial' font-size='34' fill='%23334b38'%3EAutoMatch%3C/text%3E%3C/svg%3E";

function App() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [resolvedImages, setResolvedImages] = useState({});
  const question = questions[step];
  const progress = step < 0 ? 0 : Math.round(((step + 1) / questions.length) * 100);
  const ranked = useMemo(() => vehicles.map((vehicle) => scoreVehicle(vehicle, answers)).sort((a, b) => b.score - a.score), [answers]);

  useEffect(() => {
    if (!results.length) return;
    let cancelled = false;
    const loadImages = async () => {
      const entries = await Promise.all(results.map(async (car) => {
        try {
          const params = new URLSearchParams({
            action: "query",
            generator: "search",
            gsrsearch: `${car.brand} ${car.model} automobile`,
            gsrnamespace: "6",
            gsrlimit: "1",
            prop: "imageinfo",
            iiprop: "url",
            iiurlwidth: "900",
            format: "json",
            origin: "*"
          });
          const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
          if (!response.ok) throw new Error(`Wikimedia Commons: ${response.status}`);
          const data = await response.json();
          const page = data.query && Object.values(data.query.pages)[0];
          return [car.id, page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || fallbackImage];
        } catch (error) {
          console.warn(`Impossible de charger l'image de ${car.brand} ${car.model}.`, error);
          return [car.id, fallbackImage];
        }
      }));
      if (!cancelled) setResolvedImages(Object.fromEntries(entries));
    };
    loadImages();
    return () => { cancelled = true; };
  }, [results]);

  const choose = (value) => {
    const next = question.multi ? { ...answers, priorities: answers.priorities?.includes(value) ? answers.priorities.filter((item) => item !== value) : [...(answers.priorities || []), value].slice(-3) } : { ...answers, [question.key]: value };
    setAnswers(next);
    if (!question.multi) {
      if (step === questions.length - 1) setResults(vehicles.map((vehicle) => scoreVehicle(vehicle, next)).sort((a, b) => b.score - a.score).slice(0, 6));
      else setStep(step + 1);
    }
  };
  if (step === -1) return <main className="landing"><div className="hero-card"><div className="eyebrow"><Sparkles size={16} /> AutoMatch</div><h1>Trouvez la voiture qui vous ressemble.</h1><p>Un quiz rapide et intelligent pour découvrir les modèles les plus adaptés à votre style de vie.</p><button className="primary" onClick={() => setStep(0)}>Démarrer le quiz <ArrowRight size={18} /></button><small>8 questions · 2 minutes · 100% personnalisé</small></div></main>;
  if (results.length) return <main className="results-page"><header><div className="brand">Auto<span>Match</span></div><button className="link-button" onClick={() => { setAnswers({}); setResults([]); setResolvedImages({}); setStep(-1); }}><RotateCcw size={16} /> Recommencer</button></header><section className="results-intro"><div className="eyebrow"><Sparkles size={16} /> Votre sélection personnalisée</div><h1>Voici les voitures faites pour vous.</h1><p>Les résultats sont classés selon vos réponses et vos priorités.</p></section><div className="result-grid">{results.map((car, index) => <article className="car-card" key={car.id}><img src={resolvedImages[car.id] || fallbackImage} alt={`${car.brand} ${car.model}`} onError={(event) => { event.currentTarget.src = fallbackImage; }} /><div className="car-body"><div className="rank">0{index + 1}</div><div className="compatibility">{car.score}% compatible</div><h2>{car.brand} <strong>{car.model}</strong></h2><p className="specs">{car.price.toLocaleString("fr-FR")} € · {car.power} ch · {car.seats} places</p><p className="specs">{car.fuel === "electric" ? car.consumption : `${car.consumption} · ${car.acceleration}s de 0 à 100 km/h`}</p><div className="tags">{car.reasons.slice(0, 3).map((reason) => <span key={reason}><Check size={13} /> {reason}</span>)}</div><a className="autoscout-link" href={getAutoScoutUrl(car)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Voir les annonces sur AutoScout24</a></div></article>)}</div></main>;
  return <main className="quiz-page"><header><div className="brand">Auto<span>Match</span></div><div className="step-count">{step + 1} / {questions.length}</div></header><div className="progress"><span style={{ width: `${progress}%` }} /></div><section className="question"><div className="eyebrow"><SlidersHorizontal size={16} /> Vos préférences</div><h1>{question.title}</h1><p>{question.subtitle}</p><div className="options">{question.options.map(([value, label]) => <button className={`option ${(question.multi ? answers.priorities?.includes(value) : answers[question.key] === value) ? "selected" : ""}`} key={value} onClick={() => choose(value)}><span>{label}</span>{((question.multi ? answers.priorities?.includes(value) : answers[question.key] === value)) && <Check size={18} />}</button>)}</div>{question.multi && <button className="primary continue" disabled={!answers.priorities?.length} onClick={() => { setResults(ranked.slice(0, 6)); }}>Voir mes recommandations <ArrowRight size={18} /></button>}</section><div className="navigation"><button className="link-button" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Retour</button></div></main>;
}

export default App;
