import z from 'zod'

const SignupInput = z.object({
    username: z.string().email(),
    password: z.string(),
    name: z.string().optional()
});

const SignInInput = z.object({
    username: z.string().email(),
    password: z.string()
})

const BlogPost = z.object({
    title:z.string().optional(),
    content: z.string().optional()
})

export type SignupValidation = z.infer<typeof SignupInput>
export type SignInValidation = z.infer<typeof SignInInput>
export type BlogPostValidation = z .infer<typeof BlogPost>

