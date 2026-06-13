# =============================================================================
# Cyber Link Communication — PRODUCTION MikroTik Syslog
# Router WAN: 160.187.175.26 (SFP1)  →  Log VPS: 160.187.175.30:514
# Import: /import file-name=clc-production.rsc
# =============================================================================

:local logServer "160.187.175.30"
:local logPort 514

/system identity set name="CLC-SFP1-NAT"

# --- Remote syslog action ---
/system logging action
:if ([/system logging action find name=clc-logserver] = "") do={
  add name=clc-logserver target=remote remote=$logServer remote-port=$logPort
} else={
  set [find name=clc-logserver] target=remote remote=$logServer remote-port=$logPort
}

# --- PPPoE / PPP session logs ---
/system logging
:foreach t in={"ppp,info";"pppoe,info";"ppp,debug"} do={
  :if ([find topics=$t action=clc-logserver] = "") do={
    add topics=$t action=clc-logserver
  }
}

# --- Firewall + NAT logs ---
/system logging
:foreach t in={"firewall,info";"firewall,debug"} do={
  :if ([find topics=$t action=clc-logserver] = "") do={
    add topics=$t action=clc-logserver
  }
}

# Log all forwarded traffic (ISP compliance)
/ip firewall filter
:if ([find comment="CLC-FWD-LOG"] = "") do={
  add chain=forward action=log log-prefix="FWD:" comment="CLC-FWD-LOG" place-before=0
}

# Log NAT masquerade
/ip firewall nat
:if ([find comment="CLC-NAT-LOG"] = "") do={
  add chain=srcnat action=log log-prefix="NAT:" comment="CLC-NAT-LOG"
}

:put ("Syslog target: " . $logServer . ":" . $logPort)
:put "Ensure VPS firewall: ufw allow 514/udp"
