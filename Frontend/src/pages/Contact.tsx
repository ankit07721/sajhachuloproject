import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const contactSchema = z.object({
  name:    z.string().min(2, "Please enter your name."),
  email:   z.string().email("Please provide a valid email address."),
  subject: z.string().min(1, "Please select a subject."),
  message: z.string().min(10, "Your message should be at least 10 characters long."),
});
type ContactFormValues = z.infer<typeof contactSchema>;

const Contact = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ContactFormValues) => api.post("/contact", data),
    onSuccess: () => {
      toast.success("Message Sent!", {
        description: "Thanks for reaching out. We'll get back to you soon.",
      });
      form.reset();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Submission Failed"),
  });

  const contactInfo = [
    {
      icon: MapPin,
      title: "Our Kitchen",
      details: "Butwal Kalikanagar, Rupandehi",
      actionText: "Get Directions",
      href: "https://www.google.com/maps/search/?api=1&query=27.68112,83.46704",
    },
    {
      icon: Phone,
      title: "Call Us",
      details: "(+977) 980-0000000",
      actionText: "Call Now",
      href: "tel:+9779800000000",
    },
    {
      icon: Mail,
      title: "Email Us",
      // ✅ FIX: Updated email to Sajha Chulo
      details: "hello@sajhachulo.com",
      actionText: "Send an Email",
      href: "mailto:hello@sajhachulo.com",
    },
  ];

  const faqs = [
    {
      q: "How do I track my order?",
      a: "Once your order is confirmed, you can see its status in the 'My Orders' section of your profile. We'll also send you email updates!",
    },
    {
      q: "What areas do you deliver to?",
      a: "We primarily deliver within Butwal. You can use the location checker on our homepage to see if your specific address is within our delivery zone.",
    },
    {
      // ✅ FIX: Now correctly directs to /chef-apply
      q: "How do I become a home cook?",
      a: "We'd love to have you! Visit our 'Become a Chef' page to fill out your application. Once approved by our admin team, you can start adding your dishes right away!",
    },
    {
      q: "What payment methods do you accept?",
      a: "We currently support Cash on Delivery (COD) and are working on integrating digital payments like eSewa and Khalti soon.",
    },
  ];

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <section className="gradient-hero py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We'd love to hear from you! Whether you have questions or feedback,
            we're here to help.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-2xl">Send a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="your.email@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Order Support">Order Support</SelectItem>
                            <SelectItem value="Become a Cook">Become a Cook</SelectItem>
                            <SelectItem value="General Feedback">General Feedback</SelectItem>
                            <SelectItem value="Other Inquiry">Other Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us how we can help..." rows={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full btn-primary-interactive" disabled={mutation.isPending}>
                      {mutation.isPending
                        ? <Loader2 className="animate-spin" />
                        : <><Send className="mr-2 h-4 w-4" /> Send Message</>
                      }
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {contactInfo.map((info) => (
              <a key={info.title} href={info.href} target="_blank" rel="noopener noreferrer" className="block group">
                <Card className="food-card h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <info.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{info.title}</h3>
                    <p className="text-muted-foreground mb-4">{info.details}</p>
                    <span className="font-semibold text-primary group-hover:underline">{info.actionText}</span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <Card key={index} className="food-card">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.a}</p>
                  {/* ✅ FIX: Add direct link for become a cook FAQ */}
                  {faq.q.includes("become a home cook") && (
                    <Link to="/chef-apply" className="text-primary font-semibold hover:underline text-sm mt-2 block">
                      Apply here →
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-20 gradient-primary rounded-lg p-8 md:p-12 text-center">
          <Mail className="h-16 w-16 text-primary-foreground mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Still have questions?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-6">
            Our friendly support team is here to help you.
          </p>
          <Button size="lg" variant="secondary" className="shadow-warm"
            onClick={() => form.setFocus("subject")}>
            Start a Conversation
          </Button>
        </section>
      </div>
    </div>
  );
};

export default Contact;