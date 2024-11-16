async function sendBlueskyTwitterCrossPost(requestDetails) {
  const rawBytes = requestDetails.requestBody.raw[0].bytes;
  const decoder = new TextDecoder("utf-8");
  const rawJson = decoder.decode(rawBytes);
  const parsedJson = JSON.parse(rawJson);
  const did = parsedJson.repo;
  const rawPost = parsedJson.writes[0].value;
  const postId = parsedJson.writes[0].rkey;
  const post = await parseBlueskyPost(rawPost, did, postId);

  if (!post) {
    return;
  }

  const createdTab = await chrome.tabs.create({
    url: "https://x.com",
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  chrome.tabs.sendMessage(createdTab.id, { type: "bluesky_twitter_cross_post", post });
}

chrome.webRequest.onBeforeRequest.addListener(
  sendBlueskyTwitterCrossPost,
  {
    urls: [
      "*://*/*/com.atproto.repo.applyWrites",
      "*://*/*/com.atproto.repo.applyWrites?*"
    ],
  },
  ["requestBody"],
);


//
// Parse post
//

async function parseBlueskyPost(post, did, postId) {
  if (post.$type !== "app.bsky.feed.post") {
    throw new Error("Bluesky Twitter cross-post - skipping, resource was not a post");
  } else if (post.reply) {
    throw new Error("Bluesky Twitter cross-post - skipping, post was a reply");
  }

  let text = post.text;
  let images = [];

  if (isQuotePost(post)) {
    const postUrl = await getUrlByPostUri(post.embed.uri);
    text = appendUrlToPost(text, postUrl);
  }
  if (isImageEmbed(post)) {
    images = await getImagesByPostUri(did, postId, post.embed.images);
  }

  return {
    text,
    images,
  };
}

//
// Utils
//

async function getImagesByPostUri(did, postId) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const result = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${did}/app.bsky.feed.post/${postId}`).then(res => res.json());
  const images = result.thread.post.embed.images;

  return images.map((image) => {
    const url = image.fullsize;
    const altText = image.alt;

    return { url, altText };
  });
}

async function getUrlByPostUri(uri) {
  const did = uri.split("at://").pop();
  if (did.startsWith("did:") === false) {
    throw new Error("Bluesky Twitter cross-post - could not parse quoted post URL");
  }

  const [profileDid, _, postId] = did.split("/");
  const { handle } = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${profileDid}`).then(res => res.json());

  return `https://bsky.app/profile/${handle}/post/${postId}`;
}

function appendUrlToPost(text, url) {
  return `${text}

${url}`;
}

function isQuotePost(post) {
  return post.embed?.$type === "app.bsky.embed.record";
}

function isImageEmbed(post) {
  return post.embed?.$type === "app.bsky.embed.images";
}
