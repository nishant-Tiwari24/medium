import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { SignInValidation, SignupValidation, BlogPostValidation } from '@its.nishant/medium-common';

const app = new Hono<{
	Bindings: {
		JWT_SECRET: string;
		DATABASE_URL: string;
	},
	Variables: {
		userId: string;
	}
}>();

//middleware
app.use('/api/v1/blog/*', async (c, next) => {
	const jwt = c.req.header('Authorization');
	if (!jwt) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	const token = jwt.split(' ')[1];
	const payload = await verify(token, c.env.JWT_SECRET);
	if (!payload) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	//@ts-ignore
	c.set('userId', payload.id);
	await next()
})


app.post('/api/v1/signup', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())
  	const body = await c.req.json();
	const user = await prisma.user.create({
		data : {
			email: body.email,
			password: body.password,
		}
	})
	if(user) {
		const payload = {
			id : user.id,
			exp: Math.floor(Date.now() / 1000) + 60 * 5,
		}

		const secret = c.env.JWT_SECRET;
		const token = await sign(payload,secret)
		return c.json({json: token});
	}
	return c.text('signup route')
})

app.post('/api/v1/signin', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate())
	const body = await c.req.json();
	const user = await prisma.user.findFirst({
		where: {
			email: body.email,
			password: body.password
		}
	})

	if(!user) c.status(411);
	//@ts-ignore
	const jwt = await sign({id: user.id}, c.env.JWT_SECRET);
	return c.json({token : jwt});
})

app.get('/api/v1/blog/:id', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	const id = c.req.param('id')

	const post = await prisma.post.findUnique({
		where:{
			id
		}
	})
	return c.json(post)
})

app.get('/api/v1/blog/bulk', async (c) => {
    try {
        const prisma = new PrismaClient({
            datasourceUrl: c.env?.DATABASE_URL,
        }).$extends(withAccelerate());
        console.log('Database URL:', c.env?.DATABASE_URL)
        const posts = await prisma.post.findMany({})
        console.log('Posts:', posts);
        return c.json({ hello: posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        return c.json({ error: 'Failed to fetch posts' }, 500);
    }
});


app.post('/api/v1/blog', async(c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	const body = await c.req.json();
	const post = await prisma.post.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: userId
		}
	});
	return c.json({
		id: post.id
	});
})

app.put('/api/v1/blog', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	prisma.post.update({
		where: {
			id: body.id,
			authorId: userId
		},
		data: {
			title: body.title,
			content: body.content
		}
	});

	return c.text('updated post');
});

export default app;
