# MikroTik RouterOS — ISP Log Management remote syslog setup
# Replace LOG_SERVER_IP with your Ubuntu log server public IP
# Apply: import file-name=routeros-syslog.rsc

:local logServer "LOG_SERVER_IP"
:local logPort 514

# Remote syslog action (UDP 514)
/system logging action
:if ([/system logging action find name=isp-remote] = "") do={
  add name=isp-remote target=remote remote=$logServer remote-port=$logPort
} else={
  set [find name=isp-remote] target=remote remote=$logServer remote-port=$logPort
}

# --- PPPoE / PPP session logs ---
/system logging
add topics=ppp,info action=isp-remote
add topics=pppoe,info action=isp-remote
add topics=ppp,debug action=isp-remote

# --- Firewall forward + NAT connection logs ---
/system logging
add topics=firewall,info action=isp-remote
add topics=firewall,debug action=isp-remote

# Log forwarded traffic (add firewall rules with action=log)
/ip firewall filter
:if ([find comment="ISP-LOG-FORWARD"] = "") do={
  add chain=forward action=log log-prefix="FWD:" comment="ISP-LOG-FORWARD"
}

# NAT masquerade logging (connection tracking)
/ip firewall nat
:if ([find comment="ISP-LOG-NAT"] = "") do={
  add chain=srcnat action=log log-prefix="NAT:" comment="ISP-LOG-NAT"
}

# Optional: structured script log for BTRC-style key=value export
/system script
:if ([find name=isp-log-export] = "") do={
  add name=isp-log-export source={
    :local user $user
    :local mac $caller-id
    :local priv $address
    :local pub [/ip firewall nat get [find] ...]
    :log info ("pppoe_user=" . $user . " mac_address=" . $mac . " user_ip=" . $priv)
  }
}

# Verify
:put "Syslog target: $logServer:$logPort"
/log print where topics~"ppp|firewall"
