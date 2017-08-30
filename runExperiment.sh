ssh root@games.max.pm "sudo service redwood-router restart; exit;"
echo "cd /var/HFT; ./stop_all.sh; exit;" | ssh -t ubuntu@ec2-54-149-235-92.us-west-2.compute.amazonaws.com
echo "cd /var/HFT; ./stop_all.sh; ./run_cda_groups.sh 5 1" | ssh -t ec2-52-56-242-243.eu-west-2.compute.amazonaws.com
