# =============================================================================
# Cyber Link Communication — PRODUCTION MikroTik Syslog (ISP/BTRC format)
# Router WAN: 160.187.175.26  →  Log VPS: 160.187.175.30:514
# Import: /import file-name=clc-production.rsc
# =============================================================================

:local logServer "160.187.175.30"
:local logPort 514
:local wanIp "160.187.175.26"

/system identity set name="CLC-SFP1-NAT"

# --- Remote syslog action ---
/system logging action
:if ([/system logging action find name=clc-logserver] = "") do={
  add name=clc-logserver target=remote remote=$logServer remote-port=$logPort
} else={
  set [find name=clc-logserver] target=remote remote=$logServer remote-port=$logPort
}

# --- PPPoE session logs (structured key=value on login) ---
/ppp profile
:if ([find name=clc-isp-log] = "") do={
  add name=clc-isp-log on-up={:log info ("pppoe_user=" . $user . " mac_address=" . $caller-id . " user_ip=" . $address . " nat_ip=" . $wanIp . " protocol=ppp")} on-down={:log info ("pppoe_user=" . $user . " action=logout user_ip=" . $address)}
}

/system logging
:foreach t in={"ppp,info";"pppoe,info";"ppp,debug"} do={
  :if ([find topics=$t action=clc-logserver] = "") do={
    add topics=$t action=clc-logserver
  }
}

# --- Firewall + NAT traffic logs ---
/system logging
:foreach t in={"firewall,info";"firewall,debug"} do={
  :if ([find topics=$t action=clc-logserver] = "") do={
    add topics=$t action=clc-logserver
  }
}

/ip firewall filter
:if ([find comment="CLC-FWD-LOG"] = "") do={
  add chain=forward action=log log-prefix="FWD:" comment="CLC-FWD-LOG" connection-state=new place-before=0
}

/ip firewall nat
:if ([find comment="CLC-NAT-LOG"] = "") do={
  add chain=srcnat action=log log-prefix="NAT:" comment="CLC-NAT-LOG"
}

:put ("Syslog -> " . $logServer . ":" . $logPort)
:put ("Structured format: pppoe_user=... mac_address=... user_ip=... nat_ip=" . $wanIp)
:put "Ensure VPS: ufw allow 514/udp && npm run syslog:listener"
