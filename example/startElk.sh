

docker network create elk
docker rm elasticsearch -f
docker run -it -d --net elk --name elasticsearch -p 9200:9200 -p 9300:9300 elasticsearch:5.6.12
docker rm logstash -f
docker run -it -d --net elk --name logstash -p 9998:9998 logstash:5.6.12 \
    -e 'input { tcp { port => "9998" codec => json } } output { elasticsearch { hosts => "elasticsearch" } }'
docker rm kibana -f
docker run -it -d --net elk --name kibana -e ELASTICSEARCH_URL=http://elasticsearch:9200 -p 5601:5601 kibana:5.6.12
