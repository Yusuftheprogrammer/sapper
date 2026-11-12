#!/usr/bin/env bash
# usage: ./fill-time.sh [limit_in_GB]   (default 1)
LIMIT_GB=${1:-1}
q() { docker compose exec -T db psql -U postgres -tA -c "$1"; }

echo "measuring for 30 seconds..."
t1=$(date +%s); s1=$(q "SELECT hypertable_size('readings');"); r1=$(q "SELECT count(*) FROM readings;")
sleep 30
t2=$(date +%s); s2=$(q "SELECT hypertable_size('readings');"); r2=$(q "SELECT count(*) FROM readings;")

awk -v t1=$t1 -v t2=$t2 -v s1=$s1 -v s2=$s2 -v r1=$r1 -v r2=$r2 -v lim=$LIMIT_GB 'BEGIN {
  dt = t2 - t1
  bps = (s2 - s1) / dt
  rps = (r2 - r1) / dt
  printf "current size:   %.0f MB\n", s2 / 1048576
  printf "rows/sec:       %.0f\n", rps
  printf "growth:         %.0f KB/s (%.1f MB/min)\n", bps / 1024, bps * 60 / 1048576
  if (r2 > 0) printf "bytes per row:  %.0f (whole table, indexes included)\n", s2 / r2
  if (bps > 0) printf "time to %s GB:   %.1f hours\n", lim, (lim * 1073741824 - s2) / bps / 3600
}'