import type { Lang } from './types'

const TRANSLATIONS: Record<string, { en: string; sv: string }> = {
  skip_to_content:    { en: 'Skip to main content', sv: 'Hoppa till huvudinnehållet' },

  tab_overview:       { en: 'Overview',         sv: 'Översikt' },
  tab_event_results:  { en: 'Event Results',    sv: 'Tävlingsresultat' },
  tab_athletes:       { en: 'Athlete Profiles', sv: 'Idrottarprofiler' },
  tab_rankings:       { en: 'Club Rankings',    sv: 'Klubbranking' },
  tab_extra:          { en: 'Extra Events',     sv: 'Extra evenemang' },

  // Short tab labels for narrow screens
  tab_short_overview: { en: 'Overview',  sv: 'Översikt' },
  tab_short_results:  { en: 'Results',   sv: 'Resultat' },
  tab_short_athletes: { en: 'Athletes',  sv: 'Idrottare' },
  tab_short_rankings: { en: 'Rankings',  sv: 'Ranking' },
  tab_short_extra:    { en: 'Extra',     sv: 'Extra' },

  // Discipline cards on the Overview tab
  discipline_running_title:   { en: 'Running — 5 km Track Race',  sv: 'Löpning — 5 km sprintlopp' },
  discipline_running_desc:    { en: 'A 5 km race on the track, held at Åby or Slottsskogsvallen.', sv: 'Ett 5 km-lopp på banan, vid Åby eller Slottsskogsvallen.' },
  discipline_swimming_title:  { en: 'Swimming — 2 km Open Water', sv: 'Simning — 2 km öppet vatten' },
  discipline_swimming_desc:   { en: 'A 2 km race in the beautiful Delsjön lake.', sv: 'Ett 2 km-lopp i vackra Delsjön.' },
  discipline_cycling_title:   { en: 'Cycling — 20 km Tempo',      sv: 'Cykling — 20 km tempo' },
  discipline_cycling_desc:    { en: 'A 20 km individual tempo effort held near Kungsbacka.', sv: 'Ett 20 km individuellt tempolopp nära Kungsbacka.' },
  discipline_duathlon_title:  { en: 'Duathlon — Sprint Format',   sv: 'Duathlon — sprintformat' },
  discipline_duathlon_desc:   { en: '5 km run / 20 km bike / 2.5 km run, located near the iconic Gunnebo Castle.', sv: '5 km löp / 20 km cykel / 2,5 km löp, vid det ikoniska Gunnebo slott.' },
  discipline_triathlon_title: { en: 'Triathlon — Sprint Format',  sv: 'Triathlon — sprintformat' },
  discipline_triathlon_desc:  { en: '750 m swim / 20 km bike / 5 km run, held at Inseros.', sv: '750 m sim / 20 km cykel / 5 km löp, vid Inseros.' },
  discipline_swimrun_title:   { en: 'Swimrun — Sisjön',           sv: 'Swimrun — Sisjön' },
  discipline_swimrun_desc:    { en: 'A swimrun adventure at Sisjön.', sv: 'Ett swimrun-äventyr vid Sisjön.' },

  championships_title: { en: 'Club Championships – Overview', sv: 'Klubbmästerskap – Översikt' },
  championships_intro: {
    en: 'Throughout the year, our club organises a series of championships across different disciplines. After every event, the club provides drinks and snacks — members are also welcome to bring a friend along to discover the club!',
    sv: 'Under året arrangerar klubben en serie mästerskap inom olika grenar. Efter varje tävling bjuder klubben på dryck och tilltugg — medlemmar är även välkomna att ta med en vän för att lära känna klubben!',
  },

  overview_extra_title: { en: 'Extra events & open trainings', sv: 'Extra evenemang & öppna träningar' },
  overview_extra_text:  {
    en: 'Beyond the club championships, the club also organises open timed sessions — like the SuperSprint triathlon trainings at Rådasjön on Wednesday evenings in June. Everyone is welcome, no club points are at stake, and every session is timed so you can chase your own progress.',
    sv: 'Utöver klubbmästerskapen arrangerar klubben även öppna tidtagna pass — som SuperSprint-triathlonträningarna vid Rådasjön på onsdagskvällar i juni. Alla är välkomna, inga klubbpoäng står på spel, och varje pass tidtas så att du kan jaga din egen utveckling.',
  },
  view_extra_results:   { en: 'View the results in the Extra Events tab →', sv: 'Se resultaten under fliken Extra evenemang →' },
  view_km_results:      { en: 'View the results →', sv: 'Se resultaten →' },

  created_by_title:   { en: 'Created by members, for members', sv: 'Skapad av medlemmar, för medlemmar' },
  created_by_text1:   {
    en: 'Welcome to the official Triathlon Väst competition dashboard! This platform has been created by Triathlon Väst members for Triathlon Väst members. Here you can explore all club championship results in an interactive format, making it easy to track collective achievements and individual progress over the years.',
    sv: 'Välkommen till Triathlon Västs officiella tävlingsdashboard! Denna plattform har skapats av Triathlon Väst-medlemmar för Triathlon Väst-medlemmar. Här kan du utforska alla klubbmästerskapsresultat i ett interaktivt format, vilket gör det enkelt att följa gemensamma prestationer och individuella framsteg genom åren.',
  },
  created_by_text2:   {
    en: "If you notice any mistakes in the data or have ideas for new features that could benefit our community, or prefer not to appear in the public rankings, please don't hesitate to reach out.",
    sv: 'Om du upptäcker några fel i datan, har idéer för nya funktioner som kan gynna vår gemenskap, eller föredrar att inte synas i de offentliga rankingarna, tveka inte att höra av dig.',
  },

  event_results_title:  { en: 'Event results & all-time rankings', sv: 'Tävlingsresultat & alla tiders ranking' },
  event_results_text1:  {
    en: "In the Event Results section you'll find comprehensive competition data spanning from 2021 to the present. For each discipline — triathlon, running, swimming, cycling, duathlon, or swimrun — we keep detailed records of every participant's performance, including an all-time ranking by best time.",
    sv: 'I sektionen Tävlingsresultat hittar du omfattande tävlingsdata från 2021 till idag. För varje gren — triathlon, löpning, simning, cykling, duathlon eller swimrun — har vi detaljerade register över varje deltagares prestation, inklusive en all-time-ranking efter bästa tid.',
  },
  club_rankings_title:  { en: 'Club rankings & points system', sv: 'Klubbranking & poängsystem' },
  club_rankings_text1:  {
    en: 'Our club rankings use a points system that rewards consistent participation. 1st place = 40 pts, 2nd = 35 pts, 3rd = 30 pts, then 29, 28, 27 … down to 1 pt for 32nd place.',
    sv: 'Vår klubbranking använder ett poängsystem som belönar konsekvent deltagande. 1:a plats = 40 p, 2:a = 35 p, 3:a = 30 p, sedan 29, 28, 27 … ner till 1 p för 32:a platsen.',
  },
  club_rankings_text2:  {
    en: 'Points accumulate throughout the year to create annual rankings for men and women, celebrated at Novemberplågan — our end-of-year club gathering.',
    sv: 'Poängen ackumuleras under året och skapar årsrankingar för herrar och damer, som firas vid Novemberplågan — klubbens avslutning för året.',
  },

  extra_events_title: { en: 'Extra events & timed trainings', sv: 'Extra evenemang & tidtagna träningar' },
  extra_events_text1: {
    en: 'Results from timed training sessions and other events that are not official club championships. These are just for fun — no club points are awarded, and the results do not count towards the club rankings or athlete profiles.',
    sv: 'Resultat från tidtagna träningar och andra evenemang som inte är officiella klubbmästerskap. Dessa är bara för skojs skull — inga klubbpoäng delas ut, och resultaten räknas inte med i klubbrankingen eller idrottarprofilerna.',
  },
  extra_events_text2: {
    en: 'Athletes who completed only some of the legs are listed below the ranked finishers with the legs they did.',
    sv: 'Idrottare som genomförde endast vissa delmoment listas under de rankade deltagarna med de moment de gjorde.',
  },

  athlete_profiles_title: { en: 'Individual athlete profiles', sv: 'Individuella idrottarprofiler' },
  athlete_profiles_text:  {
    en: "The Athlete Profiles section provides a personalised view of each member's competitive journey: performance history, progress over time, and how individual results contribute to club rankings.",
    sv: 'Sektionen Idrottarprofiler ger en personlig vy över varje medlems tävlingsresa: prestationshistorik, framsteg över tid och hur individuella resultat bidrar till klubbrankingen.',
  },

  contact_title:        { en: 'Contact & Contribute', sv: 'Kontakt & Bidra' },
  contact_text:         {
    en: "Your feedback helps make this dashboard better for everyone. If you've spotted a data error, have ideas for new features, or prefer to have your information removed from public rankings, send an email to schirmer.thiebaut@gmail.com with a subject like:",
    sv: 'Din feedback hjälper till att göra denna dashboard bättre för alla. Om du har hittat ett datafel, har idéer för nya funktioner, eller föredrar att få din information borttagen från offentliga rankingar, skicka ett mail till schirmer.thiebaut@gmail.com med ett ämne som:',
  },
  contact_subject_placeholder: { en: 'your subject', sv: 'ditt ämne' },
  contribute_text:      {
    en: 'If you are familiar with code, you can also propose changes directly on GitHub — open an issue or submit a pull request and we will review it together.',
    sv: 'Om du är bekant med kod kan du även föreslå ändringar direkt på GitHub — öppna ett ärende eller skicka en pull request så granskar vi det tillsammans.',
  },

  participation_by_year:   { en: 'Participation by Year and Event Type', sv: 'Deltagande per År och Tävlingstyp' },

  select_event:    { en: 'Select Event:',    sv: 'Välj Tävling:' },
  select_year:     { en: 'Select Year:',     sv: 'Välj År:' },
  select_category: { en: 'Select Category:', sv: 'Välj Kategori:' },
  all_years:       { en: 'All Years (Combined)', sv: 'Alla År (Kombinerat)' },
  all_mixed:       { en: 'Adults (Mixed)',   sv: 'Vuxna (Mixed)' },
  men_only:        { en: 'Men Only',         sv: 'Endast Herrar' },
  women_only:      { en: 'Women Only',       sv: 'Endast Damer' },
  youth_only:      { en: 'Youth Only',       sv: 'Endast Ungdom' },

  cycling:   { en: 'Cycling',   sv: 'Cykling' },
  duathlon:  { en: 'Duathlon',  sv: 'Duathlon' },
  running:   { en: 'Running',   sv: 'Löpning' },
  swimming:  { en: 'Swimming',  sv: 'Simning' },
  swimrun:   { en: 'Swimrun',   sv: 'Swimrun' },
  triathlon: { en: 'Triathlon', sv: 'Triathlon' },

  select_athlete:         { en: 'Select Athlete:', sv: 'Välj Idrottare:' },
  select_athlete_prompt:  { en: 'Please select an athlete to view their profile.', sv: 'Välj en idrottare för att visa profil.' },
  club_member:            { en: 'TriVäst Member', sv: 'TriVäst-medlem' },
  guest:                  { en: 'Guest', sv: 'Gäst' },

  womens_rankings:      { en: "Women's Rankings", sv: 'Damranking' },
  mens_rankings:        { en: "Men's Rankings",   sv: 'Herrranking' },
  rank:         { en: 'Rank',         sv: 'Placering' },
  athlete:      { en: 'Athlete',      sv: 'Idrottare' },
  total_points: { en: 'Total Points', sv: 'Totala Poäng' },
  competitions: { en: 'Competitions', sv: 'Tävlingar' },

  overall_rank:  { en: 'Overall Rank', sv: 'Total Placering' },
  class_rank:    { en: 'Class Rank',   sv: 'Klassplacering' },
  all_time_rank: { en: 'All-Time Rank', sv: 'Alla Tiders Placering' },
  name:          { en: 'Name',         sv: 'Namn' },
  gender:        { en: 'Gender',       sv: 'Kön' },
  club:          { en: 'Club',         sv: 'Klubb' },
  year:          { en: 'Year',         sv: 'År' },
  total_time:    { en: 'Total Time',   sv: 'Total Tid' },
  points:        { en: 'Points',       sv: 'Poäng' },
  swim:          { en: 'Swim',         sv: 'Sim' },
  bike:          { en: 'Bike',         sv: 'Cykel' },
  run:           { en: 'Run',          sv: 'Löp' },
  run_1:         { en: 'Run 1',        sv: 'Löp 1' },
  run_2:         { en: 'Run 2',        sv: 'Löp 2' },
  t1:            { en: 'T1',           sv: 'V1' },
  t2:            { en: 'T2',           sv: 'V2' },
  dnf:           { en: 'DNF',          sv: 'DNF' },

  no_data_available:        { en: 'No data available for', sv: 'Ingen data tillgänglig för' },
  no_extra_events:          { en: 'No extra events yet.', sv: 'Inga extra evenemang ännu.' },
  men:                      { en: 'Men',    sv: 'Herrar' },
  women:                    { en: 'Women',  sv: 'Damer' },
  results:                  { en: 'Results', sv: 'Resultat' },
  total_results:            { en: 'total results', sv: 'totala resultat' },

  overall:    { en: 'Overall',    sv: 'Totalt' },
  time:       { en: 'Time',       sv: 'Tid' },
  club_rank:  { en: 'Club Rank',  sv: 'Klubbplacering' },
  not_ranked:    { en: 'Not ranked',    sv: 'Ej rankad' },
  class_range:   { en: 'Class range',    sv: 'Klassintervall' },
  class_best:    { en: 'Class fastest',  sv: 'Klass snabbast' },
  class_worst:   { en: 'Class slowest',  sv: 'Klass långsammast' },
  class_size:    { en: 'Class size',     sv: 'Klassstorlek' },

  no_athlete_data:          { en: 'No data found for this athlete.', sv: 'Ingen data hittades för denna idrottare.' },
  search_athlete:           { en: 'Search athlete…', sv: 'Sök idrottare…' },
  personal_best:            { en: 'PB', sv: 'PB' },
  export_csv:               { en: 'Export CSV', sv: 'Exportera CSV' },
  split_times_hint:         { en: 'Split times and ranks visible on wider screens.', sv: 'Deltider och placeringar visas på bredare skärmar.' },
  show_guests:              { en: 'Show guests', sv: 'Visa gäster' },
  youth_no_data_hint:       { en: 'Youth results are currently only available as guests — enable "Show guests" above to see them.', sv: 'Ungdomsresultat finns just nu endast som gäster — aktivera "Visa gäster" ovan för att se dem.' },
}

export function t(key: string, lang: Lang = 'en'): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? key
}
