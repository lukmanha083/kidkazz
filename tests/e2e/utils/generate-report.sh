#!/bin/bash

# DDD Refactoring - Test Report Generator
# Generates formatted test reports from test results

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

# ============================================================================
# REPORT GENERATION
# ============================================================================

generate_html_report() {
  local report_file="$1"
  local html_file="${report_file%.txt}.html"

  log_info "Generating HTML report: $html_file"

  cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DDD Refactoring Test Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 36px;
      font-weight: bold;
      color: #333;
    }
    .summary-card.passed .value {
      color: #10b981;
    }
    .summary-card.failed .value {
      color: #ef4444;
    }
    .phase-results {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .phase-results h2 {
      margin: 0 0 20px 0;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-passed {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-failed {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .footer {
      text-align: center;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DDD Refactoring Test Report</h1>
    <p>Generated on: <span id="timestamp"></span></p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Total Tests</h3>
      <div class="value" id="total-tests">0</div>
    </div>
    <div class="summary-card passed">
      <h3>Passed</h3>
      <div class="value" id="passed-tests">0</div>
    </div>
    <div class="summary-card failed">
      <h3>Failed</h3>
      <div class="value" id="failed-tests">0</div>
    </div>
    <div class="summary-card">
      <h3>Success Rate</h3>
      <div class="value" id="success-rate">0%</div>
    </div>
  </div>

  <div class="phase-results">
    <h2>Phase Results</h2>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Status</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Success Rate</th>
        </tr>
      </thead>
      <tbody id="phase-results-body">
        <!-- Phase results will be inserted here -->
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>DDD Refactoring Test Suite - Kidkazz Project</p>
  </div>

  <script>
    // Set timestamp
    document.getElementById('timestamp').textContent = new Date().toLocaleString();

    // This would be populated from test results
    // For now, it's a template
  </script>
</body>
</html>
EOF

  log_success "HTML report generated: $html_file"
}

generate_json_report() {
  local results="$1"
  local json_file="$2"

  log_info "Generating JSON report: $json_file"

  cat > "$json_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "summary": {
    "totalTests": 0,
    "passed": 0,
    "failed": 0,
    "successRate": 0
  },
  "phases": []
}
EOF

  log_success "JSON report generated: $json_file"
}

# ============================================================================
# MAIN
# ============================================================================

if [ $# -eq 0 ]; then
  log_error "Usage: $0 <report-file>"
  log_error "Example: $0 reports/test-report-20250206-143022.txt"
  exit 1
fi

REPORT_FILE="$1"

if [ ! -f "$REPORT_FILE" ]; then
  log_error "Report file not found: $REPORT_FILE"
  exit 1
fi

generate_html_report "$REPORT_FILE"

log_success "Report generation complete!"
