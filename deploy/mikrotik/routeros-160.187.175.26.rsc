# Cyber Link — SFP1 NAT Router (160.187.175.26)
# WAN: SFP1  160.187.175.26/30  GW: 10.121.124.1
# MAC: 48:A9:8A:C2:28:BF
#
# CHANGE logServer to your Ubuntu log server IP (where isp-syslog-listener runs)
# Company default in DB: 160.187.175.62

:local logServer "160.187.175.62"
:local logPort 514

/system identity set name="CLC-SFP1-NAT"

/system logging action
:if ([find name=isp-logserver] = "") do={
  add name=isp-logserver target=remote remote=$logServer remote-port=$logPort
} else={
  set [find name=isp-logserver] target=remote remote=$logServer remote-port=$logPort
}

/system logging
:foreach t in={"ppp,info";"pppoe,info";"ppp,debug";"firewall,info";"firewall,debug"} do={
  :if ([find topics=$t action=isp-logserver] = "") do={
    add topics=$t action=isp-logserver
  }
}

# Log forwarded NAT traffic
/ip firewall filter
:if ([find comment="CLC-LOG-FORWARD"] = "") do={
  add chain=forward action=log log-prefix="FWD:" comment="CLC-LOG-FORWARD" place-before=0
}

/ip firewall nat
:if ([find comment="CLC-LOG-NAT"] = "") do={
  add chain=srcnat action=log log-prefix="NAT:" comment="CLC-LOG-NAT"
}

:put ("Syslog -> " . $logServer . ":" . $logPort)
:put "Router public IP: 160.187.175.26"
