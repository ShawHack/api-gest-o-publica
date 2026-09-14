#!/usr/bin/env sh
set -u
printf 'arquivo institucional limpo' >/tmp/clean.txt
clamscan --no-summary /tmp/clean.txt
printf 'X5O!P%%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' >/tmp/eicar.com
set +e
clamscan --no-summary /tmp/eicar.com
code=$?
set -e
rm -f /tmp/clean.txt /tmp/eicar.com
echo "EICAR_EXIT=$code"
test "$code" -eq 1
