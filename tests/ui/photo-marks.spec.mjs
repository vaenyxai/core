// The photo marks tool's one load-bearing layout fact: the box the marks are
// measured against is exactly the photo. Every dot is a percentage of that box,
// so if it is one pixel wider than the picture, every mark drifts — which is
// how a build that looked right on a phone put the dots off the side of the
// photo on a desktop (Oskar, 2026-07-29). Sizes are asserted at a wide viewport,
// a narrow one, and with a photo smaller than the limit.
/* global document */
import { expect, test } from "@playwright/test";

const BIG_PHOTO = 3024; // a phone camera's own pixel width
const SMALL_PHOTO = 200;

async function measure(page, columnWidth, photoWidth) {
  return page.evaluate(
    ([column, width]) => {
      const source = `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(width * 1.33)}"><rect width="100%" height="100%" fill="#888"/></svg>`,
      )}`;
      const outer = document.createElement("div");
      outer.style.cssText = `width:${column}px;position:absolute;left:-9999px;top:0;`;
      const message = document.createElement("div");
      message.className = "ask-vaenyx-message";
      const frame = document.createElement("div");
      frame.className = "annotated-photo";
      const photo = document.createElement("img");
      photo.className = "message-photo";
      frame.append(photo);
      message.append(frame);
      outer.append(message);
      document.body.append(outer);
      return new Promise((done) => {
        photo.onload = () => {
          const result = {
            frame: Math.round(frame.getBoundingClientRect().width),
            photo: Math.round(photo.getBoundingClientRect().width),
          };
          outer.remove();
          done(result);
        };
        photo.onerror = () => {
          outer.remove();
          done({ frame: -1, photo: -2 });
        };
        photo.src = source;
      });
    },
    [columnWidth, photoWidth],
  );
}

test("photo marks: the frame the dots are measured in is the photo itself", async ({
  page,
}) => {
  await page.goto("/");
  for (const [column, photo] of [
    [713, BIG_PHOTO], // desktop: the column is far wider than the photo
    [360, BIG_PHOTO], // phone: the column is about the photo's width
    [713, SMALL_PHOTO], // a photo smaller than the limit shrinks the frame too
  ]) {
    const size = await measure(page, column, photo);
    expect(size.frame, `column ${column}px, photo ${photo}px`).toBe(size.photo);
  }
});
