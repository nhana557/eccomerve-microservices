import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Agent steps call the model configured in e2e.config.ts. Without AI_GATEWAY_API_KEY these tests are skipped.
const skip = process.env.AI_GATEWAY_API_KEY ? false : 'set AI_GATEWAY_API_KEY to run agent tests';

test('the agent searches for a product on storefront', { skip }, async ({ app, agent, screen }) => {
  await app.open('/');

  await agent.act('search for {query} in the store search bar', {
    params: { query: 'Keyboard' },
  });

  await expect(screen.getByPlaceholder('Cari di T.STORE...')).toHaveValue('Keyboard');
  await agent.assert('the search bar contains Keyboard');
});
