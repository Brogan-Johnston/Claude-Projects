function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Guesses which Canvas course a local course corresponds to, so the user usually just has
// to confirm a pre-filled dropdown instead of hunting through a full course list. Exact-ish
// course-code overlap ("AE 331" vs "AE 331 - Aerodynamics") wins over a looser name match.
export function bestMatchCanvasId(course, canvasCourses) {
  const code = normalize(course.code);
  const name = normalize(course.name);
  let nameFallback = null;
  for (const cc of canvasCourses) {
    const ccCode = normalize(cc.course_code);
    const ccName = normalize(cc.name);
    if (code && ccCode && (ccCode.includes(code) || code.includes(ccCode))) return cc.id;
    if (!nameFallback && name && ccName && (ccName.includes(name) || name.includes(ccName))) {
      nameFallback = cc.id;
    }
  }
  return nameFallback;
}
