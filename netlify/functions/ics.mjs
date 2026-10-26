// Turns calendar text built in the app into a real .ics download. iPhones only show the
// "Add to Calendar" sheet for a calendar file that comes from a web address, not one
// created inside the page. Nothing is stored; the shift travels in the link itself.
export default async (req) => {
  const url = new URL(req.url);
  const d = url.searchParams.get("d") || "";
  const name = (url.searchParams.get("n") || "shift").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "shift";
  if (!d || d.length > 30000) return new Response("Missing calendar data", { status: 400 });
  let text;
  try {
    text = Buffer.from(d.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return new Response("Bad calendar data", { status: 400 });
  }
  if (!text.startsWith("BEGIN:VCALENDAR")) return new Response("Bad calendar data", { status: 400 });
  return new Response(text, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${name}.ics"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export const config = { path: "/cal.ics" };
