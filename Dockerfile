FROM node:18.3.0-alpine3.16

# add docker-credential-gcr
RUN apk --no-cache add curl \
	&& curl -fsSL -o /tmp/docker-credential-gcr.tar.gz "https://github.com/GoogleCloudPlatform/docker-credential-gcr/releases/download/v2.1.5/docker-credential-gcr_linux_amd64-2.1.5.tar.gz" \
	&& tar -xzf /tmp/docker-credential-gcr.tar.gz -C /usr/local/bin docker-credential-gcr \
	&& chmod +x /usr/local/bin/docker-credential-gcr \
	&& rm /tmp/docker-credential-gcr.tar.gz

RUN mkdir -p /gantry
WORKDIR /gantry
ADD . /gantry
RUN yarn --mode=production

CMD [ "node", "index.js" ]
EXPOSE 80
