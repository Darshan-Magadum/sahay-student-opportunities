async function inspectNSPApplicationLinks() {
  const res = await fetch('https://scholarships.gov.in/All-Scholarships', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  
  // Find all links in the page
  const allLinks = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  const uniqueLinks = [...new Set(allLinks)];
  console.log('Total unique links on All-Scholarships page:', uniqueLinks.length);
  
  // Check links containing apply, register, login, scheme, student, portal
  const appLinks = uniqueLinks.filter(l => 
    /apply|register|login|student|scheme|portal/i.test(l) && !l.endsWith('.css') && !l.endsWith('.js')
  );
  console.log('Application/Registration related links:');
  console.log(appLinks);

  // Also check homepage of scholarships.gov.in
  const homeRes = await fetch('https://scholarships.gov.in/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const homeHtml = await homeRes.text();
  const homeLinks = [...new Set([...homeHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]))];
  const homeAppLinks = homeLinks.filter(l => 
    /apply|register|login|student|otr|fresh|renew/i.test(l) && !l.endsWith('.css') && !l.endsWith('.js')
  );
  console.log('\nHomepage registration/apply links:');
  console.log(homeAppLinks);
}

inspectNSPApplicationLinks().catch(console.error);

