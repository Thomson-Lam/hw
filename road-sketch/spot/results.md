# Live spot-check: Gemini fills designed elements under pick-rules

Model `gemini-3.5-flash-lite`, JSON output, up to 3 tries per stretch with checker errors fed back. 12 sessions (2 goals x 2 personas x 3 policies), 4 stretches each. Run 2026-11-21T19:41:28.788Z.

| Policy | Stretches | Valid in 3 tries | Valid first try | Mean tries | Rule breaks caught | Distinct item titles / items | Rules at end (mean) |
|---|---|---|---|---|---|---|---|
| keep | 16 | 16/16 | 15/16 | 1.06 | 0 | 27/27 | 12.0 |
| last3 | 16 | 16/16 | 15/16 | 1.06 | 0 | 27/28 | 3.0 |
| keyed | 16 | 16/16 | 13/16 | 1.19 | 0 | 27/28 | 4.3 |

Latency per call over 53 calls: p50 1223 ms, p95 1503 ms, max 1674 ms.

Rejections by checker rule: syntax 4, length 1.

Sessions that failed a stretch after 3 tries: none.

## Transcripts

### Get into astronomy · avoider · keep

- Stretch 1, rules [], tries 1 (1559ms)
  - this or that: How do you prefer to start? (Read star maps / Watch night sky)
  - item: **Naked Eye Stargazing**: Identify major constellations visible from your backyard tonight. [outdoors, night, free, 1 h]
  - item: **Stellarium Web Tour**: Explore the night sky virtually on your browser. [visual, free, 0.5 h]
  - fork: Deep Sky Observing [prefer night] | Planetarium Apps [prefer visual] | Space History [prefer history]
  - user picked: thisthat, nope on "Naked Eye Stargazing", fork "Space History"
- Stretch 2, rules ["prefer outdoors","avoid outdoors","prefer history"], tries 1 (1047ms)
  - slider: How long to look up?
  - item: **Galileo and the Telescope**: Read how early astronomers changed our view of space. [history, reading, 1.5 h]
  - fork: Read old star logs [prefer history] | Study sky maps [prefer visual] | Listen to space sounds [avoid visual]
  - user picked: slider, nope on "Galileo and the Telescope", fork "Listen to space sounds"
- Stretch 3, rules ["prefer outdoors","avoid outdoors","prefer history","max hours 1","avoid history","avoid visual"], tries 1 (1130ms)
  - this or that: Choose your observing style (Quick check / Deep reading)
  - item: **Stargazing Handbook**: Read a concise guide on constellation shapes. [reading, quick, 0.75 h]
  - fork: Read more books [prefer reading] | Quick sky notes [prefer quick] | Build model kit [prefer hands-on]
  - user picked: thisthat, nope on "Stargazing Handbook", fork "Build model kit"
- Stretch 4, rules ["prefer outdoors","avoid outdoors","prefer history","max hours 1","avoid history","avoid visual","prefer reading","avoid reading","prefer hands-on"], tries 1 (1123ms)
  - slider: How much time for this session?
  - item: **Build a Simple Astrolabe**: Construct a basic altitude measuring tool using cardstock. [hands-on, math, 1 h]
  - fork: Build more tools [prefer math] | Listen to podcasts [prefer music] | Study ancient myths [prefer animals]
  - user picked: slider, nope on "Build a Simple Astrolabe", fork "Study ancient myths"

### Get into astronomy · steady · keyed

- Stretch 1, rules [], tries 2 (1416ms, 1135ms), rejected: syntax: not JSON
  - this or that: How do you want to start exploring? (Read Guides / Visual Tour)
  - item: **Beginner Stargazing Guide**: Learn the basic constellations visible from your backyard tonight. [reading, outdoors, 1 h]
  - item: **Deep Space Gallery**: Browse high-resolution captures of distant galaxies and nebulae. [visual, 0.5 h]
  - fork: Deep Constellation Study [prefer reading] | Stargazing Field Trip [prefer outdoors] | Astrophysics Math Lab [prefer math]
  - user picked: thisthat, save "Beginner Stargazing Guide", fork "Deep Constellation Study"
- Stretch 2, rules ["prefer reading"], tries 1 (1110ms)
  - slider: How long for tonight?
  - item: **Cosmos Stargazing Map**: Learn constellations and night sky coordinates quickly. [reading, outdoors, 1 h]
  - item: **Celestial Sphere Workshop**: Build a working mechanical model of orbits. [hands-on, visual, 2 h]
  - fork: Deep constellation reading [prefer reading] | Visual sky atlases [prefer visual] | Animal migration astronomy [prefer animals]
  - user picked: slider, save "Cosmos Stargazing Map", fork "Deep constellation reading"
- Stretch 3, rules ["max hours 2","prefer reading"], tries 1 (1201ms)
  - slider: How long for this stop?
  - item: **Stellar Evolution Handbook**: Read about the birth and death of giant stars. [reading, visual, 1 h]
  - item: **Planetary Motion Essays**: Explore historical texts on orbits and gravity. [reading, history, 1.5 h]
  - fork: Deep into literature [prefer reading] | Visual sky maps [prefer visual] | Acoustic space sounds [prefer music]
  - user picked: slider, save "Stellar Evolution Handbook", fork "Deep into literature"
- Stretch 4, rules ["max hours 1.5","prefer reading"], tries 1 (794ms)
  - this or that: Choose your reading style (Essays / Novels)
  - item: **Constellation Lore Book**: Read about ancient mythological figures in the night sky. [reading, history, 1 h]
  - fork: Deep Astronomy Texts [prefer reading] | Stargazing Walks [prefer outdoors] | Acoustic Space [prefer music]
  - user picked: thisthat, save "Constellation Lore Book", fork "Deep Astronomy Texts"

### Get into astronomy · steady · last3

- Stretch 1, rules [], tries 2 (1429ms, 1251ms), rejected: length: thisthat side
  - this or that: How do you prefer to start? (Read charts / Stargaze)
  - item: **Stargazing in the Backyard**: Step outside tonight and locate the major constellations. [outdoors, night, free, 1 h]
  - item: **Read Astronomy Basics**: Explore introductory guides about planets and stars. [reading, cheap, 1.5 h]
  - fork: Build a telescope [prefer hands-on] | Join astronomy club [prefer social] | Listen to space podcasts [prefer music]
  - user picked: thisthat, save "Stargazing in the Backyard", fork "Build a telescope"
- Stretch 2, rules ["prefer reading","prefer outdoors","prefer hands-on"], tries 1 (979ms)
  - slider: How long will your stargazing session be?
  - item: **Build a Simple Star Chart**: Craft a rotating paper wheel to find constellations tonight. [hands-on, reading, outdoors, 1.5 h]
  - fork: Deep night sky session [prefer outdoors] | Switch to reading guides [prefer reading] | Explore ancient calendars [prefer history]
  - user picked: slider, save "Build a Simple Star Chart", fork "Deep night sky session"
- Stretch 3, rules ["max hours 2","prefer hands-on","prefer outdoors"], tries 1 (1223ms)
  - this or that: Choose your stargazing setup preference. (Binoculars / Small Scope)
  - item: **Navigate by Constellations**: Learn major patterns visible tonight using your own eyes. [outdoors, free, quick, 1 h]
  - item: **Construct a Moon Phase Tracker**: Assemble a cardboard wheel to predict lunar cycles. [hands-on, cheap, 1.5 h]
  - fork: Deep Sky Astrophotography [prefer night] | Sideways Shift [prefer visual] | Ancient Sky Lore [prefer history]
  - user picked: thisthat, save "Navigate by Constellations", fork "Deep Sky Astrophotography"
- Stretch 4, rules ["prefer outdoors","prefer outdoors","prefer night"], tries 1 (1503ms)
  - this or that: Choose your stargazing style. (Deep Space / Solar Viewing)
  - item: **Visit a Local Dark Sky Site**: Travel to a designated dark location for clear views. [outdoors, night, far, 3 h]
  - item: **Attend a Planetarium Show**: Learn constellations inside a dome theater. [visual, reading, 1.5 h]
  - fork: Astrophotography Basics [prefer night] | Solar System Scale [prefer outdoors] | Space History [prefer history]
  - user picked: thisthat, save "Visit a Local Dark Sky Site", fork "Astrophotography Basics"

### Get into astronomy · steady · keep

- Stretch 1, rules [], tries 1 (1674ms)
  - this or that: How do you prefer to start? (Star Gazing / Read Science)
  - item: **Naked Eye Constellation Hunt**: Learn major star patterns without any gear. [night, outdoors, 1 h]
  - item: **Beginner Stargazing Guide**: Read foundational concepts of celestial navigation. [reading, 1.5 h]
  - fork: Deep into optics [prefer hands-on] | Sideways to history [prefer history] | Explore unknown [prefer cheap]
  - user picked: thisthat, save "Naked Eye Constellation Hunt", fork "Deep into optics"
- Stretch 2, rules ["prefer night","prefer night","prefer hands-on"], tries 2 (1350ms, 1291ms), rejected: syntax: not JSON
  - this or that: Choose your viewing setup (Binoculars / Small Scope)
  - item: **Binocular Moon Mapping**: Trace lunar craters using handheld binoculars and a map. [outdoors, hands-on, night, 1.5 h]
  - item: **Star Cluster Sketching**: Draw the Pleiades cluster while observing through a lens. [hands-on, visual, night, 2 h]
  - fork: Deep Sky Astrophotography [prefer visual] | Astronomical Club Meetup [prefer social] | History of Telescopes [prefer history]
  - user picked: thisthat, save "Binocular Moon Mapping", fork "Deep Sky Astrophotography"
- Stretch 3, rules ["prefer night","prefer night","prefer hands-on","prefer outdoors","prefer outdoors","prefer visual"], tries 1 (1272ms)
  - this or that: Choose your viewing style tonight (Wide Field / Deep Space)
  - item: **Meteor Shower Watch Party**: Count shooting stars under the dark sky. [night, outdoors, 2.5 h]
  - item: **Planet Tracker App Setup**: Calibrate tools to find planets easily. [hands-on, visual, 1 h]
  - fork: Deep Night Focus [prefer night] | Visual Gear [prefer visual] | Astrophotography Lab [prefer cheap]
  - user picked: thisthat, save "Meteor Shower Watch Party", fork "Deep Night Focus"
- Stretch 4, rules ["prefer night","prefer night","prefer hands-on","prefer outdoors","prefer outdoors","prefer visual","prefer outdoors","prefer night","prefer night"], tries 1 (1334ms)
  - this or that: Choose your viewing style tonight (Wide Field / Deep Space)
  - item: **Build a Simple Planisphere**: Construct a cardboard star wheel for finding tonight constellations easily. [hands-on, night, 1.5 h]
  - item: **Dark Sky Site Scouting**: Find a local low-light horizon for crystal clear celestial viewing. [outdoors, night, 2 h]
  - fork: Astrophotography Setup [prefer visual] | Astronomy Book Club [prefer social] | Cosmology Theory [prefer math]
  - user picked: thisthat, save "Build a Simple Planisphere", fork "Astrophotography Setup"

### Get into astronomy · avoider · last3

- Stretch 1, rules [], tries 1 (1116ms)
  - this or that: How do you want to start exploring? (Read books / Look outside)
  - item: **Stargazing in the Backyard**: Learn major constellations using just your naked eyes tonight. [outdoors, night, 1 h]
  - item: **DIY Star Charting**: Draw your own celestial map using basic observation notes. [hands-on, visual, 1.5 h]
  - fork: Deep stargazing guides [prefer reading] | Local astronomy club [prefer social] | Astrophotography tech [prefer music]
  - user picked: thisthat, nope on "Stargazing in the Backyard", fork "Astrophotography tech"
- Stretch 2, rules ["prefer outdoors","avoid outdoors","prefer music"], tries 1 (1086ms)
  - slider: How long for this stretch?
  - item: **Cosmic Soundscape Listening Session**: Listen to space-inspired ambient music while reading star lore. [music, reading, 1.5 h]
  - fork: Deep into literature [prefer reading] | Sideways to sounds [prefer music] | Unknown territory [prefer cheap]
  - user picked: slider, nope on "Cosmic Soundscape Listening Session", fork "Unknown territory"
- Stretch 3, rules ["max hours 1","avoid music","prefer cheap"], tries 1 (1183ms)
  - this or that: Choose your night view approach (Naked Eye / Binoculars)
  - item: **Download Moon Atlas App**: Explore lunar features on your phone screen [visual, cheap, 0.5 h]
  - fork: Track Satellites Online [prefer visual] | Read Stargazing Guide [prefer reading] | Feed Zoo Nocturnal Animals [prefer animals]
  - user picked: thisthat, nope on "Download Moon Atlas App", fork "Feed Zoo Nocturnal Animals"
- Stretch 4, rules ["prefer visual","avoid visual","prefer animals"], tries 1 (1181ms)
  - this or that: Choose your stargazing style (Binocular Sweep / Planetarium App)
  - item: **Evening Constellation Walk**: Identify major seasonal patterns with a simple map outdoors. [outdoors, reading, 1.5 h]
  - fork: Join local astronomy club [prefer social] | Read about telescopes [prefer reading] | Bake celestial cookies [prefer food]
  - user picked: thisthat, nope on "Evening Constellation Walk", fork "Bake celestial cookies"

### Learn to cook on a student budget · steady · keep

- Stretch 1, rules [], tries 1 (1177ms)
  - slider: How long for this session?
  - item: **Mastering Basic Rice Bowls**: Learn cheap pantry staples with grains and legumes. [food, cheap, 1 h]
  - item: **One-Pot Pasta Mechanics**: Discover starch ratios for fast and inexpensive meals. [food, quick, 1.5 h]
  - fork: Budget Groceries [prefer cheap] | Quick Prep [prefer quick] | Outdoor Grill [prefer outdoors]
  - user picked: slider, save "Mastering Basic Rice Bowls", fork "Budget Groceries"
- Stretch 2, rules ["max hours 2","prefer food","prefer cheap"], tries 1 (1181ms)
  - slider: How much time can you spend?
  - item: **Lentil Soup Fundamentals**: Create hearty meals using dry staples and spices. [food, cheap, 1 h]
  - item: **Budget Egg Fried Rice**: Transform leftover ingredients into a warm, savory dinner. [food, cheap, 0.5 h]
  - fork: Master knife skills [prefer food] | Bake affordable bread [prefer cheap] | Explore local flora [prefer outdoors]
  - user picked: slider, save "Lentil Soup Fundamentals", fork "Master knife skills"
- Stretch 3, rules ["max hours 2","prefer food","prefer cheap","max hours 2","prefer food","prefer food"], tries 1 (1244ms)
  - this or that: Pick your preferred cooking equipment: (Sheet Pan / Slow Cooker)
  - item: **Oven Roasted Root Veggies**: Toss seasonal vegetables in oil and roast until tender. [food, cheap, 1 h]
  - item: **Quick Chickpea Salad**: Combine canned chickpeas with simple pantry dressings. [food, quick, 0.5 h]
  - fork: Baking Bread [prefer food] | Pantry Inventory [prefer cheap] | Animal Tracking [prefer animals]
  - user picked: thisthat, save "Oven Roasted Root Veggies", fork "Baking Bread"
- Stretch 4, rules ["max hours 2","prefer food","prefer cheap","max hours 2","prefer food","prefer food","prefer food","prefer food","prefer food"], tries 1 (1109ms)
  - this or that: Choose your cooking style today (Stove Top / Batch Prep)
  - item: **Savory Oatmeal Bowls**: Turn basic oats into a savory cheap meal. [food, cheap, 0.75 h]
  - item: **Black Bean Quesadillas**: Crispy tortillas filled with spiced beans and cheese. [food, cheap, 0.5 h]
  - fork: Master Knife Skills [prefer food] | Pantry Meal Prep [prefer cheap] | Music While Cooking [prefer music]
  - user picked: thisthat, save "Savory Oatmeal Bowls", fork "Master Knife Skills"

### Learn to cook on a student budget · steady · last3

- Stretch 1, rules [], tries 1 (1302ms)
  - this or that: Choose your cooking style today. (Quick Bites / Budget Meals)
  - item: **Mastering Rice and Beans**: Learn the ultimate cheap and filling student staple dish. [cheap, hands-on, 1 h]
  - item: **Pantry Pasta Basics**: Create delicious sauces using only what is in your cupboard. [cheap, quick, 0.75 h]
  - fork: Bake Cheap Bread [prefer hands-on] | Grocery Store Haul [prefer cheap] | Stargaze Outdoors [prefer outdoors]
  - user picked: thisthat, save "Mastering Rice and Beans", fork "Bake Cheap Bread"
- Stretch 2, rules ["prefer quick","prefer cheap","prefer hands-on"], tries 1 (1181ms)
  - slider: How long to practice cooking?
  - item: **One-Pot Lentil Soup**: Use dry lentils and basic spices for cheap meals. [food, cheap, hands-on, 1 h]
  - item: **Budget Veggie Stir-Fry**: Transform discounted produce into a quick hot dinner. [food, cheap, quick, 0.75 h]
  - fork: Master Knife Skills [prefer hands-on] | Plan Weekly Menus [prefer cheap] | Study Food History [prefer history]
  - user picked: slider, save "One-Pot Lentil Soup", fork "Master Knife Skills"
- Stretch 3, rules ["max hours 2","prefer food","prefer hands-on"], tries 1 (1304ms)
  - slider: How much time can you spend cooking?
  - item: **Egg Fried Rice Masterclass**: Transform day-old rice into a cheap hot meal. [food, hands-on, cheap, 0.75 h]
  - item: **Sheet Pan Roasted Veggies**: Chop root vegetables, oil, and roast until tender. [food, cheap, free, 1 h]
  - fork: Bake Cheap Bread [prefer hands-on] | Quick Microwave Hacks [prefer cheap] | Late Night Snacking [prefer night]
  - user picked: slider, save "Egg Fried Rice Masterclass", fork "Bake Cheap Bread"
- Stretch 4, rules ["max hours 2","prefer food","prefer hands-on"], tries 1 (1323ms)
  - this or that: Choose your cooking style: (Stovetop / Baking)
  - item: **Basic Bread Baking**: Learn flour water and yeast for cheap daily loaves. [food, hands-on, cheap, 1.5 h]
  - item: **Simple Tomato Sauce**: Simmer canned tomatoes with garlic and herbs. [food, hands-on, 1 h]
  - fork: Advanced Baking [prefer food] | Kitchen Organization [prefer cheap] | Music Pairing [prefer music]
  - user picked: thisthat, save "Basic Bread Baking", fork "Advanced Baking"

### Get into astronomy · avoider · keyed

- Stretch 1, rules [], tries 2 (1252ms, 1227ms), rejected: syntax: not JSON
  - this or that: How do you want to learn first? (Read books / Look outside)
  - item: **Beginner Stargazing Guide**: Learn basic constellations and find the North Star tonight. [reading, outdoors, 1 h]
  - item: **Stellar Brightness Math**: Calculate apparent magnitude and distance to nearby stars. [math, reading, 1.5 h]
  - fork: Deep backyard stargazing [prefer night] | Build a cardboard telescope [prefer hands-on] | Listen to space podcasts [prefer music]
  - user picked: thisthat, nope on "Beginner Stargazing Guide", fork "Listen to space podcasts"
- Stretch 2, rules ["prefer outdoors","avoid reading","prefer music"], tries 1 (1310ms)
  - this or that: How do you prefer to learn? (Listen to ambient / Watch visuals)
  - item: **Night Sky Soundscapes**: Listen to cosmic ambient music under the open stars. [outdoors, music, 1.5 h]
  - item: **Binocular Constellation Tour**: Find major constellations visually without heavy textbooks. [outdoors, visual, 1 h]
  - fork: Deep into astrophotography [prefer visual] | Sideways to telescope gear [avoid visual] | Explore culinary stargazing [prefer food]
  - user picked: thisthat, nope on "Night Sky Soundscapes", fork "Explore culinary stargazing"
- Stretch 3, rules ["avoid reading","prefer music","avoid outdoors","prefer food"], tries 1 (1253ms)
  - this or that: Choose your astronomy style (Ambient space tunes / Stargazing snacks)
  - item: **Cosmic Sound Exploration**: Listen to translated radio emissions from distant planets. [music, 1.5 h]
  - fork: Deep into data [prefer math] | Visual art focus [prefer visual] | Animal constellations [prefer animals]
  - user picked: thisthat, nope on "Cosmic Sound Exploration", fork "Animal constellations"
- Stretch 4, rules ["avoid reading","avoid outdoors","prefer food","avoid music","prefer animals"], tries 1 (1383ms)
  - this or that: Choose your cosmic snack style (Star Cookies / Moon Pie)
  - item: **Astro Bakery Night**: Bake cookies shaped like planets and constellations indoors [food, hands-on, 1.5 h]
  - item: **Planetarium Snack Bar**: Enjoy space themed snacks while watching digital sky shows [food, visual, 2 h]
  - fork: Deep Space Baking [prefer food] | Visual Constellations [prefer visual] | Math Calculations [prefer math]
  - user picked: thisthat, nope on "Astro Bakery Night", fork "Math Calculations"

### Learn to cook on a student budget · steady · keyed

- Stretch 1, rules [], tries 1 (1342ms)
  - this or that: Choose your cooking style today (Hot Stove / No Cook)
  - item: **Pantry Pasta Masterclass**: Turn basic staples into a satisfying weeknight meal. [food, cheap, hands-on, 1 h]
  - item: **Budget Bean Stew**: Dried beans and aromatics create deep savory flavors. [food, cheap, 1.5 h]
  - fork: Master knife skills [prefer hands-on] | Save more money [prefer cheap] | Explore history [prefer history]
  - user picked: thisthat, save "Pantry Pasta Masterclass", fork "Master knife skills"
- Stretch 2, rules ["prefer food","prefer hands-on"], tries 1 (1313ms)
  - this or that: Choose your primary kitchen style (Hot stove / No cook)
  - item: **Sheet Pan Egg Fried Rice**: Transform leftover rice and cheap veggies into crispy fried rice. [food, hands-on, cheap, 0.75 h]
  - item: **One-Pot Lentil Dahl**: Simmer protein-rich red lentils with pantry spices for cheap dinners. [food, hands-on, 1 h]
  - fork: Master knife skills [prefer hands-on] | Plan cheap bulk meals [prefer food] | Explore local farm markets [prefer outdoors]
  - user picked: thisthat, save "Sheet Pan Egg Fried Rice", fork "Master knife skills"
- Stretch 3, rules ["prefer food","prefer hands-on"], tries 1 (1074ms)
  - slider: How many hours can you cook?
  - item: **Thrifty Veggie Dumpling Folds**: Learn folding basics with cheap cabbage and carrots. [food, hands-on, cheap, 1.5 h]
  - item: **Oatmeal Bread from Scratch**: Bake a loaf using basic pantry staples. [food, hands-on, cheap, 2 h]
  - fork: Master knife skills [prefer food] | Try cheap baking [prefer hands-on] | Study food history [prefer history]
  - user picked: slider, save "Thrifty Veggie Dumpling Folds", fork "Master knife skills"
- Stretch 4, rules ["prefer hands-on","max hours 1.5","prefer food"], tries 2 (909ms, 1035ms), rejected: syntax: not JSON
  - slider: How much time to cook tonight?
  - item: **Microwave Mug Omelet**: Quick single-serve egg meal using cheap fridge scraps. [food, hands-on, cheap, 0.5 h]
  - fork: Master basic knife skills [prefer hands-on] | Bake budget sweet treats [prefer food] | Learn ancient pottery bowls [prefer history]
  - user picked: slider, save "Microwave Mug Omelet", fork "Master basic knife skills"

### Learn to cook on a student budget · avoider · keep

- Stretch 1, rules [], tries 1 (1286ms)
  - this or that: Choose your cooking style: (One Pot / Meal Prep)
  - item: **Mastering Budget Lentil Soup**: A hearty, nutritious meal costing under two dollars per batch. [food, cheap, hands-on, 1 h]
  - item: **Pantry Pasta Masterclass**: Turn basic staples into restaurant quality comfort food. [food, cheap, 0.5 h]
  - fork: Baking Bread [prefer food] | Quick Snacks [prefer cheap] | Music Pairing [prefer music]
  - user picked: thisthat, nope on "Mastering Budget Lentil Soup", fork "Music Pairing"
- Stretch 2, rules ["prefer cheap","avoid food","prefer music"], tries 1 (1120ms)
  - slider: How many hours can you practice?
  - item: **Kitchen Beats Playlist Prep**: Set up a rhythm for chopping vegetables efficiently. [music, cheap, 1 h]
  - item: **Audiobook and Rice Bowl**: Learn grain absorption ratios while listening to albums. [cheap, reading, 1.5 h]
  - fork: More Budget Beats [prefer music] | Save More Money [prefer cheap] | Animal Care [prefer animals]
  - user picked: slider, nope on "Kitchen Beats Playlist Prep", fork "Animal Care"
- Stretch 3, rules ["prefer cheap","avoid food","prefer music","max hours 1","avoid music","prefer animals"], tries 1 (979ms)
  - this or that: Pick your kitchen vibe (Silent focus / Lo-fi beats)
  - item: **One-Pot Oat Porridge**: Budget-friendly warm breakfast [reading, cheap, 0.5 h]
  - fork: Master budget baking [prefer reading] | Try instant noodles [prefer cheap] | Explore textile weaving [prefer visual]
  - user picked: thisthat, nope on "One-Pot Oat Porridge", fork "Explore textile weaving"
- Stretch 4, rules ["prefer cheap","avoid food","prefer music","max hours 1","avoid music","prefer animals","prefer math","avoid reading","prefer visual"], tries 1 (1119ms)
  - this or that: Choose your kitchen vibe (Silent Prep / Colorize Plate)
  - item: **Root Vegetable Cost Breakdown**: Calculate exact costs per portion using basic arithmetic. [math, cheap, 0.5 h]
  - fork: Analyze Nutrition Data [prefer math] | Sketch Dish Layout [prefer visual] | Night Market Stroll [prefer night]
  - user picked: thisthat, nope on "Root Vegetable Cost Breakdown", fork "Night Market Stroll"

### Learn to cook on a student budget · avoider · keyed

- Stretch 1, rules [], tries 1 (1291ms)
  - this or that: Choose your ideal student cooking style (Quick Bites / Saved Cash)
  - item: **One-Pot Pasta Basics**: Master cheap dinners using only one pot to save time. [cheap, quick, 1 h]
  - item: **Pantry Staple Curry**: Create rich flavors using low-cost dried spices and lentils. [cheap, food, 1.5 h]
  - fork: Meal prep batches [prefer cheap] | Baking bread [prefer hands-on] | Stargazing snacks [prefer night]
  - user picked: thisthat, nope on "One-Pot Pasta Basics", fork "Stargazing snacks"
- Stretch 2, rules ["avoid cheap","prefer night"], tries 1 (1217ms)
  - slider: How long to cook?
  - item: **Midnight Stir Fry Skills**: Master fast wok techniques after dark using basic fridge finds. [night, hands-on, 1 h]
  - item: **Evening Baking Basics**: Learn dough fundamentals during late hours. [night, reading, 2 h]
  - fork: More night sessions [prefer night] | Try hands-on tasks [prefer hands-on] | Explore animal care [prefer animals]
  - user picked: slider, nope on "Midnight Stir Fry Skills", fork "Explore animal care"
- Stretch 3, rules ["avoid cheap","max hours 1","avoid night","prefer animals"], tries 1 (1010ms)
  - this or that: Choose your cooking style (Savory Meats / Plant Based)
  - item: **Budget Chicken Skillet**: Master simple poultry dishes quickly without spending much. [animals, food, 0.75 h]
  - fork: Advanced Proteins [prefer animals] | Kitchen Speed [prefer quick] | Math & Ratios [prefer math]
  - user picked: thisthat, nope on "Budget Chicken Skillet", fork "Math & Ratios"
- Stretch 4, rules ["avoid cheap","max hours 1","avoid night","avoid animals","prefer math"], tries 1 (1230ms)
  - slider: Set max cooking prep time
  - item: **Ratio Rice and Beans**: Measure precise grain to liquid ratios for perfect batches. [math, food, quick, 0.5 h]
  - item: **Oatmeal Portion Math**: Scale ingredient weights and costs for single servings. [math, food, reading, 0.5 h]
  - fork: Grain Scaling [prefer math] | Spice Blends [prefer food] | Outdoor Grilling [prefer outdoors]
  - user picked: slider, nope on "Ratio Rice and Beans", fork "Outdoor Grilling"

### Learn to cook on a student budget · avoider · last3

- Stretch 1, rules [], tries 1 (1140ms)
  - slider: How long to study cooking today?
  - item: **Master Cheap Pantry Pasta**: Turn basic staples into a filling dinner. [food, cheap, 1 h]
  - item: **Egg Basics for Dorms**: Learn fast, inexpensive methods for perfect eggs. [food, quick, 0.75 h]
  - fork: Batch Prep [prefer food] | Save Money [prefer cheap] | Garden Herbs [prefer outdoors]
  - user picked: slider, nope on "Master Cheap Pantry Pasta", fork "Garden Herbs"
- Stretch 2, rules ["max hours 1","avoid food","prefer outdoors"], tries 1 (1324ms)
  - this or that: Choose your budget cooking focus: (Camp Stove / Dorm Microwave)
  - item: **Campfire Foil Packets**: Prepare cheap vegetable packets over an open fire. [outdoors, cheap, 0.75 h]
  - item: **Outdoor Stove Rice Bowl**: Boil grains cheaply using a portable burner. [outdoors, quick, 0.5 h]
  - fork: Advanced Camp Meals [prefer outdoors] | Quick Savings [prefer cheap] | Music Pairing [prefer music]
  - user picked: thisthat, nope on "Campfire Foil Packets", fork "Music Pairing"
- Stretch 3, rules ["prefer quick","avoid outdoors","prefer music"], tries 1 (1347ms)
  - this or that: Choose your ideal kitchen vibe (Lo-fi Beats / Silent Focus)
  - item: **Five Minute Mug Omelet**: Whip up a warm breakfast fast in your dorm. [quick, food, cheap, 0.5 h]
  - item: **Single Skillet Fried Rice**: Turn leftover rice into a flavorful student meal. [food, cheap, hands-on, 0.75 h]
  - fork: Deep dive into baking [prefer hands-on] | Explore more quick bites [prefer quick] | Study ancient food origins [prefer history]
  - user picked: thisthat, nope on "Five Minute Mug Omelet", fork "Study ancient food origins"
- Stretch 4, rules ["prefer reading","avoid quick","prefer history"], tries 1 (1153ms)
  - this or that: How do you prefer your recipes? (Cookbooks / Videos)
  - item: **Medieval Peasant Pottage Stew**: Hearty historical root vegetables simmered slowly on a budget. [history, cheap, 1.5 h]
  - item: **Traditional Bread Baking Science**: Understand fermentation and flour ratios through deep text study. [reading, hands-on, 2 h]
  - fork: Ancient Grains [prefer history] | Budget Baking [prefer reading] | Stray Pets [prefer animals]
  - user picked: thisthat, nope on "Medieval Peasant Pottage Stew", fork "Stray Pets"

