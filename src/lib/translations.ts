import type { Lang } from './types'

const TRANSLATIONS: Record<string, { en: string; sv: string }> = {
  tab_overview:       { en: 'Overview',         sv: 'Översikt' },
  tab_event_results:  { en: 'Event Results',    sv: 'Tävlingsresultat' },
  tab_athletes:       { en: 'Athlete Profiles', sv: 'Idrottarprofiler' },
  tab_rankings:       { en: 'Club Rankings',    sv: 'Klubbranking' },

  championships_title: { en: 'Club Championships – Overview', sv: 'Klubbmästerskap – Översikt' },
  championships_intro: {
    en: 'Throughout the year, our club organises a series of championships across different disciplines. After every event, the club provides drinks and snacks — members are also welcome to bring a friend along to discover the club!',
    sv: 'Under året arrangerar klubben en serie mästerskap inom olika grenar. Efter varje tävling bjuder klubben på dryck och tilltugg — medlemmar är även välkomna att ta med en vän för att lära känna klubben!',
  },

  welcome_title:      { en: 'Welcome to the Triathlon Väst dashboard!', sv: 'Välkommen till Triathlon Västs dashboard!' },
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
  event_results_text2: {
    en: 'You can filter results by year and category (men / women / all). For multi-sport events we provide segment breakdowns: swim, bike, run, and transitions.',
    sv: 'Du kan filtrera resultat efter år och kategori (herr / dam / alla). För multisporttävlingar visar vi delsträckor: sim, cykel, löp och växlingar.',
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

  athlete_profiles_title: { en: 'Individual athlete profiles', sv: 'Individuella idrottarprofiler' },
  athlete_profiles_text:  {
    en: "The Athlete Profiles section provides a personalised view of each member's competitive journey: performance history, progress over time, and how individual results contribute to club rankings.",
    sv: 'Sektionen Idrottarprofiler ger en personlig vy över varje medlems tävlingsresa: prestationshistorik, framsteg över tid och hur individuella resultat bidrar till klubbrankingen.',
  },

  contact_title:        { en: 'Contact & Support', sv: 'Kontakt & Support' },
  contact_text:         {
    en: "Your feedback helps make this dashboard better for everyone. If you've spotted a data error, have ideas for new features, or prefer to have your information removed from public rankings, send an email to schirmer.thiebaut@gmail.com with a subject like:",
    sv: 'Din feedback hjälper till att göra denna dashboard bättre för alla. Om du har hittat ett datafel, har idéer för nya funktioner, eller föredrar att få din information borttagen från offentliga rankingar, skicka ett mail till schirmer.thiebaut@gmail.com med ett ämne som:',
  },
  contact_subject_placeholder: { en: 'your subject', sv: 'ditt ämne' },

  competition_statistics:  { en: 'Competition Statistics', sv: 'Tävlingsstatistik' },
  participation_by_year:   { en: 'Participation by Year and Event Type', sv: 'Deltagande per År och Tävlingstyp' },

  select_event:    { en: 'Select Event:',    sv: 'Välj Tävling:' },
  select_year:     { en: 'Select Year:',     sv: 'Välj År:' },
  select_category: { en: 'Select Category:', sv: 'Välj Kategori:' },
  all_years:       { en: 'All Years (Combined)', sv: 'Alla År (Kombinerat)' },
  all_mixed:       { en: 'All (Mixed)',      sv: 'Alla (Mixed)' },
  men_only:        { en: 'Men Only',         sv: 'Endast Herrar' },
  women_only:      { en: 'Women Only',       sv: 'Endast Damer' },

  cycling:   { en: 'Cycling',   sv: 'Cykling' },
  duathlon:  { en: 'Duathlon',  sv: 'Duathlon' },
  running:   { en: 'Running',   sv: 'Löpning' },
  swimming:  { en: 'Swimming',  sv: 'Simning' },
  swimrun:   { en: 'Swimrun',   sv: 'Swimrun' },
  triathlon: { en: 'Triathlon', sv: 'Triathlon' },

  athlete_analysis:       { en: 'Individual Athlete Analysis', sv: 'Individuell Idrottaranalys' },
  select_athlete:         { en: 'Select Athlete:', sv: 'Välj Idrottare:' },
  select_athlete_prompt:  { en: 'Please select an athlete to view their profile.', sv: 'Välj en idrottare för att visa profil.' },
  performance_profile:    { en: 'Performance Profile', sv: 'Prestationsprofil' },
  club_member:            { en: 'TriVäst Member', sv: 'TriVäst-medlem' },
  guest:                  { en: 'Guest', sv: 'Gäst' },
  club_rankings_summary:  { en: 'Club Rankings Summary', sv: 'Sammanfattning av Klubbranking' },
  overall_rankings_all_years: { en: 'Overall Rankings (All Years)', sv: 'Övergripande Ranking (Alla År)' },
  yearly_rankings:        { en: 'Yearly Rankings', sv: 'Årsranking' },
  individual_event_results: { en: 'Individual Event Results', sv: 'Individuella Tävlingsresultat' },

  club_rankings_points: { en: 'Club Rankings & Points', sv: 'Klubbranking & Poäng' },
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
  transitions:   { en: 'Transitions',  sv: 'Växlingar' },

  no_data_available:        { en: 'No data available for', sv: 'Ingen data tillgänglig för' },
  total_participants:       { en: 'total participants', sv: 'totalt antal deltagare' },
  all_participants:         { en: 'All Participants',   sv: 'Alla Deltagare' },
  men:                      { en: 'Men',    sv: 'Herrar' },
  women:                    { en: 'Women',  sv: 'Damer' },
  results:                  { en: 'Results', sv: 'Resultat' },
  all_time_best:            { en: 'All-Time Best Performances', sv: 'Alla Tiders Bästa Prestationer' },
  ranked_by_best_times:     { en: 'Ranked by best times ever across all years', sv: 'Rankad efter bästa tider genom alla år' },
  combined_results:         { en: 'Combined results from', sv: 'Kombinerade resultat från' },
  years:                    { en: 'years', sv: 'år' },
  total_results:            { en: 'total results', sv: 'totala resultat' },
  select_event_year_category: { en: 'Please select an event, year, and category.', sv: 'Välj en tävling, ett år och en kategori.' },

  cycling_championship:  { en: 'Cycling Championship',  sv: 'Cykelmästerskap' },
  duathlon_championship: { en: 'Duathlon Championship', sv: 'Duathlonmästerskap' },
  running_championship:  { en: 'Running Championship',  sv: 'Löpmästerskap' },
  swimming_championship: { en: 'Swimming Championship', sv: 'Simmästerskap' },
  swimrun_championship:  { en: 'Swimrun Championship',  sv: 'Swimrunmästerskap' },
  triathlon_championship:{ en: 'Triathlon Championship',sv: 'Triathlonmästerskap' },

  language: { en: 'Language', sv: 'Språk' },
  english:  { en: 'English',  sv: 'Engelska' },
  swedish:  { en: 'Swedish',  sv: 'Svenska' },

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
  improvement:              { en: 'vs prev.', sv: 'jmf föreg.' },
}

export function t(key: string, lang: Lang = 'en'): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? key
}
