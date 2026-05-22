const express = require('express');
const router = express.Router();

router.post('/score', (req, res) => {
  const contracts = Array.isArray(req.body?.contracts) ? req.body.contracts : [
    { title: 'Skyward Atlas', months_since_publication: 38, sales_last_12m: 92, rights_term_months: 36 },
    { title: 'City of Glass Keys', months_since_publication: 14, sales_last_12m: 1400, rights_term_months: 60 },
  ];
  const rows = contracts.map((contract) => {
    const elapsed = Number(contract.months_since_publication || 0);
    const term = Number(contract.rights_term_months || 36);
    const sales = Number(contract.sales_last_12m || 0);
    const score = Math.min(100, Math.round(Math.max(0, elapsed - term) * 5 + (sales < 250 ? 35 : 0)));
    return { title: contract.title, score, tier: score >= 70 ? 'reversion_window' : score >= 35 ? 'review_clause' : 'normal', action: score >= 35 ? 'Review out-of-print and sales threshold clauses with rights team.' : 'No rights action needed.' };
  });
  res.json({ reviewCount: rows.filter((row) => row.score >= 35).length, contracts: rows });
});

module.exports = router;
